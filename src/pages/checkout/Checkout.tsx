import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, handleSupabaseError, retryOperation } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CreditCard, MapPin, Plus, Trash2, WalletCards } from 'lucide-react';

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

interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  street_address: string;
  postal_code: string;
  is_default: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'alipay' | 'wechat' | 'card';
  label: string;
  icon: React.ReactNode;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'alipay',
    type: 'alipay',
    label: '支付宝',
    icon: <WalletCards className="w-6 h-6 text-blue-500" />
  },
  {
    id: 'wechat',
    type: 'wechat',
    label: '微信支付',
    icon: <WalletCards className="w-6 h-6 text-green-500" />
  },
  {
    id: 'card',
    type: 'card',
    label: '银行卡',
    icon: <CreditCard className="w-6 h-6 text-gray-500" />
  }
];

export default function Checkout() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('alipay');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: 0
  });

  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const cartItems = location.state?.items;
    if (!cartItems || cartItems.length === 0) {
      navigate('/cart');
      return;
    }

    setItems(cartItems);
    calculateOrderSummary(cartItems);

    // Only fetch addresses if user is authenticated
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated, location.state]);

  const fetchAddresses = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });
      });

      if (error) throw error;

      if (data) {
        setAddresses(data);
        const defaultAddress = data.find(addr => addr.is_default);
        setSelectedAddress(defaultAddress || null);
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching addresses');
      setError(handledError.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderSummary = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product.base_price * item.quantity);
    }, 0);

    const shipping = subtotal >= 199 ? 0 : 10; // Free shipping over ¥199
    const discount = 0; // Calculate any applicable discounts

    setOrderSummary({
      subtotal,
      shipping,
      discount,
      total: subtotal + shipping - discount
    });
  };

  const handleSubmitOrder = async () => {
    if (!selectedAddress) {
      setError('请选择收货地址');
      return;
    }

    // If not logged in, redirect to login first
    if (!isAuthenticated) {
      navigate('/auth/login', { 
        state: { 
          from: '/checkout',
          items: items // Pass cart items through navigation state
        }
      });
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create order with retry
      const { data: order, error: orderError } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .insert({
            user_id: user?.id,
            status: 'pending_payment',
            total_amount: orderSummary.total,
            shipping_address_id: selectedAddress.id,
            shipping_fee: orderSummary.shipping
          })
          .select()
          .single();
      });

      if (orderError) throw orderError;

      if (order) {
        // Create order items
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product.name,
          product_price: item.product.base_price,
          quantity: item.quantity,
          customization: item.customization
        }));

        const { error: itemsError } = await retryOperation(async () => {
          return await supabase
            .from('order_items')
            .insert(orderItems);
        });

        if (itemsError) throw itemsError;

        // Create payment record
        const { error: paymentError } = await retryOperation(async () => {
          return await supabase
            .from('payment_records')
            .insert({
              order_id: order.id,
              amount: orderSummary.total,
              payment_method: selectedPayment,
              status: 'pending'
            });
        });

        if (paymentError) throw paymentError;

        // Clear cart items if they came from cart
        if (location.state?.fromCart) {
          const { error: cartError } = await retryOperation(async () => {
            return await supabase
              .from('cart_items')
              .delete()
              .in('id', items.map(item => item.id));
          });

          if (cartError) throw cartError;
        }

        // Redirect to payment page
        navigate(`/payment/${order.id}`);
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'creating order');
      setError(handledError.message);
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">订单结算</h1>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 text-red-500 p-4 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shipping Address Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  收货地址
                </h2>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加新地址
                </button>
              </div>

              <div className="space-y-4">
                {addresses.map(address => (
                  <div
                    key={address.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedAddress?.id === address.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedAddress(address)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="font-medium text-gray-900">
                            {address.recipient_name}
                          </span>
                          <span className="ml-4 text-gray-600">{address.phone}</span>
                          {address.is_default && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded">
                              默认
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600">
                          {address.province} {address.city} {address.district}
                        </div>
                        <div className="text-gray-600">{address.street_address}</div>
                        <div className="text-gray-500 text-sm">{address.postal_code}</div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle edit
                          }}
                          className="text-gray-400 hover:text-indigo-600"
                        >
                          编辑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle delete
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">订单商品</h2>
                <div className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <div key={item.id} className="py-6 flex">
                      <div className="flex-shrink-0 w-24 h-24">
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                      <div className="ml-6 flex-1">
                        <div className="flex justify-between">
                          <div>
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
                          <div className="text-right">
                            <p className="text-base font-medium text-gray-900">
                              ¥{item.product.base_price.toFixed(2)}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              x{item.quantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">支付方式</h2>
              <div className="grid grid-cols-3 gap-4">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPayment === method.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedPayment(method.id)}
                  >
                    <div className="flex items-center justify-center">
                      {method.icon}
                      <span className="ml-2 font-medium text-gray-900">
                        {method.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h2 className="text-lg font-medium text-gray-900 mb-4">订单明细</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between text-base text-gray-600">
                  <span>商品总价</span>
                  <span>¥{orderSummary.subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-base text-gray-600">
                  <span>运费</span>
                  <span>
                    {orderSummary.shipping === 0 ? '免运费' : `¥${orderSummary.shipping.toFixed(2)}`}
                  </span>
                </div>

                {orderSummary.discount > 0 && (
                  <div className="flex justify-between text-base text-green-600">
                    <span>优惠金额</span>
                    <span>-¥{orderSummary.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-lg font-medium text-gray-900">
                    <span>实付款</span>
                    <span>¥{orderSummary.total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmitOrder}
                  disabled={submitting || !selectedAddress}
                  className="w-full mt-6 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? '提交中...' : '提交订单'}
                </button>

                <p className="mt-2 text-sm text-gray-500 text-center">
                  点击"提交订单"即表示您同意
                  <a href="#" className="text-indigo-600 hover:text-indigo-500">
                    《用户服务协议》
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}