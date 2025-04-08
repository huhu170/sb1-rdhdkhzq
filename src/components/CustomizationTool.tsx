import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Palette, Droplets, Circle, Eye, Ruler, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
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

interface CustomizationState {
  [key: string]: string | number;
}

interface CustomizationToolProps {
  initialProduct?: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
  };
}

export default function CustomizationTool({ initialProduct }: CustomizationToolProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);
  const [customization, setCustomization] = useState<CustomizationState>({});
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取所有产品
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          setProducts(data);
          
          // 如果有初始产品，从产品列表中找到对应的产品
          if (initialProduct) {
            const matchedProduct = data.find(p => p.id === initialProduct.id);
            setSelectedProduct(matchedProduct || data[0]);
          } else {
            setSelectedProduct(data[0]);
          }
        }

        // 获取定制选项
        await fetchCustomizationOptions();
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialProduct]);

  useEffect(() => {
    if (selectedProduct) {
      calculateTotalPrice();
    }
  }, [selectedProduct, customization]);

  const fetchCustomizationOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('customization_options')
        .select('*')
        .order('order');

      if (error) throw error;

      if (data && data.length > 0) {
        setCustomizationOptions(data);
        // 初始化默认值
        const defaultState: CustomizationState = {};
        data.forEach(option => {
          if (option.type === 'number') {
            defaultState[option.id] = Number(option.default_value || option.min || 0);
          } else {
            defaultState[option.id] = option.default_value || '';
          }
        });
        console.log('Setting initial state:', defaultState);
        setCustomization(defaultState);
      }
    } catch (err: any) {
      console.error('Error fetching customization options:', err);
      setError(err.message);
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedProduct) return;

    let total = selectedProduct.base_price;

    customizationOptions.forEach(option => {
      const selectedValue = customization[option.id];
      if (selectedValue !== undefined) {
        if (option.type === 'color' || option.type === 'select') {
          const selectedOption = option.options?.find(opt => opt.value === selectedValue);
          if (selectedOption?.price_adjustment) {
            total += selectedOption.price_adjustment;
          }
        } else if (option.price_adjustment) {
          total += option.price_adjustment;
        }
      }
    });

    setTotalPrice(total);
  };

  const handleCustomizationChange = (optionId: string, value: string | number) => {
    if (typeof value === 'number') {
      // 处理近视度数的特殊梯度
      const option = customizationOptions.find(opt => opt.id === optionId);
      if (option?.name === '近视度数') {
        const numValue = parseFloat(value.toString());
        if (numValue > 500) {
          // 500-1500区间使用50的梯度
          const remainder = (numValue - 500) % 50;
          if (remainder !== 0) {
            value = remainder < 25 ? numValue - remainder : numValue + (50 - remainder);
          }
        } else {
          // 0-500区间使用25的梯度
          const remainder = numValue % 25;
          if (remainder !== 0) {
            value = remainder < 12.5 ? numValue - remainder : numValue + (25 - remainder);
          }
        }
      }
    }
    setCustomization(prev => ({
      ...prev,
      [optionId]: value
    }));
  };

  const getStepValue = (option: CustomizationOption, currentValue: string | number): number => {
    if (option.name === '近视度数') {
      const numValue = typeof currentValue === 'string' ? parseFloat(currentValue) : currentValue;
      return numValue > 500 ? 50 : 25;
    }
    return option.step || 1;
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
    }
  };

  const handleAddToCart = async () => {
    if (!session) {
      navigate('/auth/login', { state: { from: '/' } });
      return;
    }

    if (!selectedProduct) return;

    try {
      setAddingToCart(true);
      setError(null);

      // Get or create user's cart
      let { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!cart) {
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: session.user.id })
          .select('id')
          .single();

        if (createError) throw createError;
        cart = newCart;
      }

      // Add item to cart
      const { error: addError } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: selectedProduct.id,
          quantity: 1,
          customization
        });

      if (addError) throw addError;

      // 触发自定义事件通知导航栏更新购物车计数
      window.dispatchEvent(new CustomEvent('cart-updated'));

      // Show success message
      alert('已添加到购物车');
      
      // Reset customization to defaults
      const defaultState: CustomizationState = {};
      customizationOptions.forEach(option => {
        if (option.default_value !== undefined) {
          defaultState[option.id] = option.default_value;
        }
      });
      setCustomization(defaultState);

    } catch (err: any) {
      console.error('Error adding to cart:', err);
      setError(err.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const renderCustomizationOption = (option: CustomizationOption) => {
    switch (option.type) {
      case 'color':
        return (
          <div className="flex items-center gap-4">
            <label className="flex items-center text-gray-700 min-w-[120px]">
              <Palette className="w-5 h-5 mr-2" />
              {option.name}
            </label>
            <div className="flex-1">
              <select
                value={customization[option.id] as string}
                onChange={(e) => handleCustomizationChange(option.id, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                {option.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} {opt.price_adjustment ? `(+¥${opt.price_adjustment})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'number':
        const currentValue = Number(customization[option.id] ?? (option.min || 0));
        const stepValue = getStepValue(option, currentValue);
        
        return (
          <div className="flex items-center gap-4">
            <label className="flex items-center text-gray-700 min-w-[120px]">
              <Circle className="w-5 h-5 mr-2" />
              {option.name}
            </label>
            <div className="flex-1">
              <div className="relative">
                <input
                  type="range"
                  min={option.min || 0}
                  max={option.max || 100}
                  step={stepValue}
                  value={currentValue}
                  onChange={(e) => handleCustomizationChange(option.id, parseFloat(e.target.value))}
                  className="w-full"
                />
                {option.name === '近视度数' && (
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0度</span>
                    <span>500度</span>
                    <span>1000度</span>
                    <span>1500度</span>
                  </div>
                )}
                {option.name === '散光度数' && (
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0度</span>
                    <span>250度</span>
                    <span>500度</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="flex items-center gap-4">
            <label className="flex items-center text-gray-700 min-w-[120px]">
              <Droplets className="w-5 h-5 mr-2" />
              {option.name}
            </label>
            <div className="flex-1">
              <select
                value={customization[option.id] as string}
                onChange={(e) => handleCustomizationChange(option.id, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                {option.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} {opt.price_adjustment ? `(+¥${opt.price_adjustment})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-24" id="customize">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">定制专属镜片</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            使用我们的智能定制工具，打造完美契合您需求的彩色隐形眼镜
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 text-red-500 p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Left Column - Main Configuration */}
          <div className="md:col-span-3">
            <div className="bg-white p-8 rounded-xl shadow-lg h-full">
              {/* 产品选择 */}
              <div className="mb-8">
                <select
                  value={selectedProduct?.id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ¥{product.base_price}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="text-sm text-gray-600 mt-2">{selectedProduct.description}</p>
                )}
              </div>

              {/* 所有定制选项 */}
              <div className="space-y-4">
                {customizationOptions
                  .sort((a, b) => a.order - b.order)
                  .map(option => (
                    <div key={option.id}>
                      {renderCustomizationOption(option)}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column - Preview and Actions */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg h-full flex flex-col">
              {/* 产品预览图 */}
              {selectedProduct && (
                <div className="relative w-full aspect-square mb-6 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              )}

              {/* 定制参数列表 */}
              <div className="flex-grow space-y-3">
                {customizationOptions.map(option => {
                  const value = customization[option.id];
                  let displayValue = value;
                  
                  if (option.type === 'color' || option.type === 'select') {
                    const selectedOption = option.options?.find(opt => opt.value === value);
                    displayValue = selectedOption?.label || value;
                  }

                  return (
                    <div key={option.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                      <span className="text-gray-600">{option.name}</span>
                      <span className="font-medium text-gray-900">
                        {displayValue} {option.unit || ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 价格和操作按钮 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium">总价</span>
                  <span className="text-2xl font-bold text-indigo-600">¥{totalPrice}</span>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full flex items-center justify-center bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {addingToCart ? '添加中...' : '加入购物车'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}