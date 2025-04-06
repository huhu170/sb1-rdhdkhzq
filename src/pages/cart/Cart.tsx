import React, { useEffect, useState } from 'react';
import { supabase, handleSupabaseError, retryOperation, checkAuth } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, RefreshCw } from 'lucide-react';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  customization: any;
  product: {
    name: string;
    base_price: number;
    image_url: string;
  };
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const { session, isAuthenticated, loading: authLoading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 添加额外的认证验证
    const verifyAuth = async () => {
      // 首先检查 useAuth 钩子的状态
      if (authLoading) return;

      if (!isAuthenticated) {
        navigate('/auth/login', { 
          state: { from: location.pathname },
          replace: true 
        });
        return;
      }

      // 然后进行额外检查以确保会话有效
      const validSession = await checkAuth();
      if (!validSession) {
        console.error('有效会话验证失败，重定向到登录页');
        navigate('/auth/login', { 
          state: { from: location.pathname, message: '您的会话已过期，请重新登录' },
          replace: true 
        });
        return;
      }

      // 验证通过，获取购物车数据
      console.log('认证有效，正在获取购物车数据');
      fetchCartItems();
    };

    verifyAuth();
  }, [isAuthenticated, authLoading, location.pathname]);

  const fetchCartItems = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
      }
      setError(null);
      
      console.log('Fetching cart items for user:', session?.user.id);
      
      // Get user's cart with retry
      let cartData;
      const { data: initialCart, error: cartError } = await retryOperation(async () => {
        return await supabase
          .from('carts')
          .select('id')
          .eq('user_id', session?.user.id)
          .maybeSingle();
      });

      console.log('Cart query result:', initialCart, cartError);
      cartData = initialCart;

      if (!cartData) {
        console.log('Creating new cart for user:', session?.user.id);
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: session?.user.id })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating cart:', createError);
          throw createError;
        }
        cartData = newCart;
        console.log('New cart created:', cartData);
      }

      if (cartData) {
        console.log('Fetching cart items for cart_id:', cartData.id);
        
        // 第一步：获取购物车项目
        const { data: cartItemsData, error: itemsError } = await retryOperation(async () => {
          return await supabase
            .from('cart_items')
            .select('*')
            .eq('cart_id', cartData.id);
        });

        console.log('Cart items raw data:', cartItemsData, itemsError);

        if (itemsError) {
          console.error('Error fetching cart items:', itemsError);
          throw itemsError;
        }

        if (!cartItemsData || cartItemsData.length === 0) {
          console.log('No cart items found');
          setCartItems([]);
          setRetryCount(0);
          return;
        }

        // 第二步：获取产品详情
        const productIds = cartItemsData.map(item => item.product_id);
        console.log('Fetching products with ids:', productIds);
        
        const { data: productsData, error: productsError } = await retryOperation(async () => {
          return await supabase
            .from('products')
            .select('*')
            .in('id', productIds);
        });

        console.log('Products data:', productsData, productsError);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          throw productsError;
        }

        // 第三步：合并数据
        const mergedItems = cartItemsData.map(item => {
          const product = productsData?.find(p => p.id === item.product_id);
          return {
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            customization: item.customization,
            product: {
              name: product?.name || '未知商品',
              base_price: product?.base_price || 0,
              image_url: product?.image_url || ''
            }
          } as CartItem;
        });

        console.log('Merged cart items:', mergedItems);
        setCartItems(mergedItems);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching cart items');
      console.error('Error in fetchCartItems:', err, handledError);
      setError(handledError.message);
      
      // Implement exponential backoff for retries
      if (retryCount < 3) {
        setRetrying(true);
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          setRetrying(false);
          fetchCartItems(true);
        }, delay);
      }
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      setError(null);
      const { error } = await retryOperation(async () => {
        return await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', itemId);
      });

      if (error) throw error;

      setCartItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'updating quantity');
      setError(handledError.message);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!window.confirm('确定要从购物车中移除此商品吗？')) {
      return;
    }

    try {
      setError(null);
      const { error } = await retryOperation(async () => {
        return await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
      });

      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'removing item');
      setError(handledError.message);
    }
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedItems(prev => {
      if (prev.size === cartItems.length) {
        return new Set();
      }
      return new Set(cartItems.map(item => item.id));
    });
  };

  const calculateItemTotal = (item: CartItem) => {
    let total = item.product.base_price;
    // Add customization costs
    if (item.customization) {
      Object.entries(item.customization).forEach(([key, value]) => {
        // Add logic to calculate additional costs based on customization
      });
    }
    return total * item.quantity;
  };

  const calculateTotal = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleCheckout = () => {
    if (selectedItems.size === 0) {
      alert('请先选择要结算的商品');
      return;
    }

    // Get selected items with full details
    const checkoutItems = cartItems.filter(item => selectedItems.has(item.id));
    
    // Navigate to checkout with selected items
    navigate('/checkout', { 
      state: { items: checkoutItems }
    });
  };

  const handleManualRetry = () => {
    setRetryCount(0);
    fetchCartItems();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">购物车是空的</h3>
            <p className="mt-1 text-sm text-gray-500">
              快去挑选心仪的商品吧！
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                继续购物
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">我的购物车</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchCartItems()}
              className="flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新购物车
            </button>
            <button
              onClick={async () => {
                try {
                  // 刷新认证状态
                  await refreshSession();
                  const authState = await checkAuth();
                  console.log("认证状态:", authState);
                  
                  // 查询所有购物车
                  const { data: carts } = await supabase.from('carts').select('*');
                  console.log("所有购物车:", carts);
                  
                  if (carts && carts.length > 0) {
                    // 查询第一个购物车的项目
                    const { data: items } = await supabase
                      .from('cart_items')
                      .select('*')
                      .eq('cart_id', carts[0].id);
                    console.log("购物车项目:", items);
                    
                    if (items && items.length > 0) {
                      // 查询产品详情
                      const { data: products } = await supabase
                        .from('products')
                        .select('*')
                        .in('id', items.map(i => i.product_id));
                      console.log("产品详情:", products);
                    }
                  }
                  
                  alert('诊断信息已输出到控制台，请按F12查看');
                } catch (err) {
                  console.error("诊断错误:", err);
                  alert('诊断失败，请查看控制台');
                }
              }}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              数据诊断
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 text-red-500 p-4 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <span>{error}</span>
              {retrying && (
                <div className="ml-3 flex items-center text-sm text-gray-500">
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  正在重试 (第 {retryCount} 次)...
                </div>
              )}
            </div>
            {!retrying && (
              <button
                onClick={handleManualRetry}
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                重试
              </button>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  checked={selectedItems.size === cartItems.length}
                  onChange={toggleSelectAll}
                />
                <span className="ml-2 text-gray-700">全选</span>
              </label>
              <div className="ml-8 text-gray-500">商品信息</div>
              <div className="ml-auto grid grid-cols-4 gap-8">
                <div>单价</div>
                <div>数量</div>
                <div>小计</div>
                <div>操作</div>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="divide-y divide-gray-200">
            {cartItems.map(item => (
              <div key={item.id} className="px-6 py-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleSelectItem(item.id)}
                  />
                  <div className="ml-4 flex-shrink-0">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-base font-medium text-gray-900">
                      {item.product.name}
                    </h3>
                    {item.customization && (
                      <div className="mt-1 text-sm text-gray-500">
                        {Object.entries(item.customization).map(([key, value]) => (
                          <div key={key}>
                            {key}: {value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 grid grid-cols-4 gap-8 items-center">
                    <div className="text-gray-900">
                      ¥{item.product.base_price.toFixed(2)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded-md hover:bg-gray-100"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-indigo-600 font-medium">
                      ¥{calculateItemTotal(item).toFixed(2)}
                    </div>
                    <div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    checked={selectedItems.size === cartItems.length}
                    onChange={toggleSelectAll}
                  />
                  <span className="ml-2 text-gray-700">全选</span>
                </label>
                <span className="text-gray-500">
                  已选 {selectedItems.size} 件商品
                </span>
              </div>
              <div className="flex items-center space-x-8">
                <div className="text-gray-700">
                  合计：
                  <span className="text-2xl font-bold text-indigo-600">
                    ¥{calculateTotal().toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.size === 0}
                  className="px-8 py-3 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                >
                  结算 ({selectedItems.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}