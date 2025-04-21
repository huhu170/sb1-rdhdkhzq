import React, { useEffect, useState } from 'react';
import { supabase, handleSupabaseError, retryOperation, checkAuth } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, RefreshCw, Home } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

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

interface CustomizationOption {
  id: string;
  name: string;
  type: 'color' | 'number' | 'select';
  options?: { value: string; label: string; price_adjustment?: number }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  required: boolean;
  default_value?: string | number;
  price_adjustment?: number;
  group: string;
  order: number;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);
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
      fetchCustomizationOptions(); // 先获取定制选项
      fetchCartItems();
    };

    verifyAuth();
  }, [isAuthenticated, authLoading, location.pathname]);

  const fetchCustomizationOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('customization_options')
        .select('*')
        .order('order');

      if (error) throw error;

      if (data) {
        setCustomizationOptions(data);
      }
    } catch (err: any) {
      console.error('Error fetching customization options:', err);
      setError('获取定制选项失败');
    }
  };

  // 根据UUID获取对应的定制选项名称和值
  const getCustomizationDisplay = (key: string, value: any): { name: string, displayValue: any, unit?: string } => {
    // 查找定制选项
    const option = customizationOptions.find(opt => opt.id === key);
    
    if (option) {
      // 如果是颜色或选择类型，则从选项中找出对应的标签
      if ((option.type === 'color' || option.type === 'select') && option.options) {
        try {
          const optionData = option.options;
          const selectedOption = optionData.find(opt => opt.value === value);
          if (selectedOption) {
            return {
              name: option.name,
              displayValue: selectedOption.label,
              unit: option.unit
            };
          }
        } catch (e) {
          console.error('解析选项数据失败:', e);
        }
      }
      
      // 返回选项名称和原始值
      return {
        name: option.name,
        displayValue: value,
        unit: option.unit
      };
    }
    
    // 如果找不到对应的选项，返回UUID和原始值
    return {
      name: key,
      displayValue: value
    };
  };

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
        // 未使用的变量，但保留查询以便将来添加价格计算
        // const { name, displayValue, unit } = getCustomizationDisplay(key, value);
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
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">购物车是空的</h3>
              <p className="mt-1 text-sm text-gray-500">
                快去挑选心仪的商品吧！
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Link>
                <Link
                  to="/rgpok"
                  className="inline-flex items-center px-4 py-2 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 hover:bg-indigo-50"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  去购物
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-500 hover:text-indigo-600">
                <Home className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">我的购物车</h1>
            </div>
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
                <label className="inline-flex items-center w-[40px]">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    checked={selectedItems.size === cartItems.length}
                    onChange={toggleSelectAll}
                  />
                </label>
                <div className="flex-1 grid grid-cols-[1fr_120px_150px_120px_80px] gap-4 items-center">
                  <div className="text-gray-500">商品信息</div>
                  <div className="text-gray-500 text-center">单价</div>
                  <div className="text-gray-500 text-center">数量</div>
                  <div className="text-gray-500 text-center">小计</div>
                  <div className="text-gray-500 text-center">操作</div>
                </div>
              </div>
            </div>

            {/* Cart Items */}
            <div className="divide-y divide-gray-200">
              {cartItems.map(item => (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex items-start">
                    <label className="inline-flex items-center w-[40px] pt-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                      />
                    </label>
                    <div className="flex-1 grid grid-cols-[1fr_120px_150px_120px_80px] gap-4 items-start">
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 flex-shrink-0">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-gray-900 truncate">
                            {item.product.name}
                          </h3>
                          {item.customization && (
                            <div className="mt-3 text-gray-600">
                              <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                                {Object.entries(item.customization).map(([key, value]) => {
                                  const { name, displayValue, unit } = getCustomizationDisplay(key, value);
                                  return (
                                    <div key={key} className="flex items-center">
                                      <span className="text-sm text-gray-500 min-w-[5rem]">{name}</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {String(displayValue)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-900 text-center">
                        ¥{item.product.base_price.toFixed(2)}
                      </div>
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
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
                      <div className="text-indigo-600 font-medium text-center">
                        ¥{calculateItemTotal(item).toFixed(2)}
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100"
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
      <Footer />
    </>
  );
}