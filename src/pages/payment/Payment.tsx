import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { retryOperation, handleSupabaseError } from '../../lib/supabase';

// 定义类型
interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_fee: number;
  user_id: string;
  created_at: string;
  shipping_address_id: string;
  shipping_address?: {
    recipient_name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    street_address: string;
    postal_code: string;
  };
}

interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  customization: any;
}

// 支付方式图标组件
const PaymentMethodIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'alipay':
      return <div className="text-blue-500 font-bold">支付宝</div>;
    case 'wechat':
      return <div className="text-green-500 font-bold">微信支付</div>;
    case 'card':
      return <div className="text-gray-700 font-bold">银行卡</div>;
    default:
      return <div>{method}</div>;
  }
};

export default function Payment() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    const fetchOrderAndPayment = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        // 获取订单信息
        const { data: orderData, error: orderError } = await retryOperation(async () => {
          return await supabase
            .from('orders')
            .select(`
              *,
              shipping_address:shipping_addresses(*)
            `)
            .eq('id', id)
            .single();
        });

        if (orderError) throw orderError;
        if (!orderData) throw new Error('未找到订单');
        
        // 获取订单项
        const { data: itemsData, error: itemsError } = await retryOperation(async () => {
          return await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id);
        });

        if (itemsError) throw itemsError;
        
        // 获取支付信息
        const { data: paymentData, error: paymentError } = await retryOperation(async () => {
          return await supabase
            .from('payment_records')
            .select('*')
            .eq('order_id', id)
            .single();
        });

        if (paymentError) throw paymentError;
        if (!paymentData) throw new Error('未找到支付记录');
        
        setOrder(orderData);
        setOrderItems(itemsData || []);
        setPayment(paymentData);
        
        // 检查支付状态
        if (paymentData.status === 'success') {
          setPaymentSuccess(true);
        }
      } catch (err: any) {
        console.error('Error fetching payment data:', err);
        const handledError = handleSupabaseError(err, 'fetching payment data');
        setError(handledError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndPayment();
  }, [id]);

  // 处理支付操作
  const handlePayment = async () => {
    if (!payment || !order) return;
    
    try {
      setProcessing(true);
      
      // 模拟支付处理
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 更新支付状态
      const { error: updateError } = await retryOperation(async () => {
        return await supabase
          .from('payment_records')
          .update({ 
            status: 'success',
            transaction_id: `TX-${Date.now()}`, // 生成交易ID
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
      });

      if (updateError) throw updateError;
      
      // 更新订单状态
      const { error: orderUpdateError } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
      });

      if (orderUpdateError) throw orderUpdateError;
      
      // 清空用户购物车
      await clearUserCart();
      
      // 记录支付日志
      await logPaymentActivity();
      
      // 更新本地状态
      setPaymentSuccess(true);
    } catch (err: any) {
      console.error('支付处理错误:', err);
      const handledError = handleSupabaseError(err, 'processing payment');
      setError(handledError.message);
    } finally {
      setProcessing(false);
    }
  };

  // 清空用户购物车
  const clearUserCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // 获取用户的购物车
      const { data: userCart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (cartError || !userCart) return;
      
      // 删除购物车中的所有商品
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', userCart.id);
        
      console.log('购物车已清空');
    } catch (err) {
      console.error('清空购物车失败:', err);
      // 不中断支付流程，所以这里不抛出错误
    }
  };

  // 记录支付活动
  const logPaymentActivity = async () => {
    try {
      if (!order || !payment) return;
      
      await supabase
        .from('activity_logs')
        .insert({
          user_id: order.user_id,
          action: 'payment_completed',
          module: 'payment',
          details: {
            order_id: order.id,
            payment_id: payment.id,
            amount: payment.amount,
            payment_method: payment.payment_method
          }
        });
    } catch (err) {
      console.error('记录支付活动失败:', err);
      // 不中断支付流程
    }
  };

  // 处理支付回调 - 模拟支付网关回调处理
  const handlePaymentCallback = async (callbackData: any) => {
    // 在实际应用中，这会是一个接收支付网关回调的端点
    // 这里只是模拟这个过程
    try {
      // 验证回调签名
      const isValid = verifyCallbackSignature(callbackData);
      if (!isValid) {
        throw new Error('无效的回调签名');
      }
      
      // 更新支付状态
      if (callbackData.status === 'success' && payment) {
        await supabase
          .from('payment_records')
          .update({ 
            status: 'success',
            transaction_id: callbackData.transaction_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
          
        setPaymentSuccess(true);
      }
    } catch (err) {
      console.error('处理支付回调错误:', err);
    }
  };

  // 模拟验证回调签名
  const verifyCallbackSignature = (callbackData: any) => {
    // 实际实现中，这里会使用密钥验证签名
    // 检查签名、时间戳等
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-start">
            <AlertCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-medium">加载支付信息时出错</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <Link to="/orders" className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回订单列表
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <h3 className="text-yellow-800 font-medium">未找到支付信息</h3>
            <Link to="/orders" className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回订单列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">订单支付</h1>
          <Link to="/orders" className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回订单
          </Link>
        </div>
        
        {/* 支付成功提示 */}
        {paymentSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-md flex items-start">
            <CheckCircle className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-green-800 font-medium">支付成功！</h3>
              <p className="text-green-700 mt-1">您的订单已支付成功，我们将尽快为您发货。</p>
              <Link to="/orders" className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800">
                查看订单详情
              </Link>
            </div>
          </div>
        )}
        
        {/* 订单信息卡片 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="border-b border-gray-200 p-4 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">订单信息</h2>
          </div>
          
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">订单编号</span>
              <span className="text-gray-900 font-medium">{order.order_number}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">订单状态</span>
              <span className="text-indigo-600 font-medium">
                {order.status === 'pending_payment' && '待支付'}
                {order.status === 'processing' && '处理中'}
                {order.status === 'shipped' && '已发货'}
                {order.status === 'delivered' && '已送达'}
                {order.status === 'cancelled' && '已取消'}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">下单时间</span>
              <span className="text-gray-900">
                {new Date(order.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-900 mb-3">商品清单</h3>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{item.product_name}</div>
                      <div className="text-xs text-gray-500">
                        单价: ¥{item.product_price.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ¥{(item.product_price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">商品总价</span>
                <span className="text-gray-900">¥{(order.total_amount - order.shipping_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">运费</span>
                <span className="text-gray-900">
                  {order.shipping_fee > 0 ? `¥${order.shipping_fee.toFixed(2)}` : '免运费'}
                </span>
              </div>
              <div className="flex justify-between text-base font-medium mt-4 pt-4 border-t border-gray-100">
                <span className="text-gray-900">实付金额</span>
                <span className="text-indigo-600">¥{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 支付方式卡片 */}
        {!paymentSuccess && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 p-4 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">选择支付方式</h2>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`border rounded-lg p-4 flex items-center justify-center cursor-pointer ${payment.payment_method === 'alipay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <PaymentMethodIcon method="alipay" />
                </div>
                <div className={`border rounded-lg p-4 flex items-center justify-center cursor-pointer ${payment.payment_method === 'wechat' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <PaymentMethodIcon method="wechat" />
                </div>
                <div className={`border rounded-lg p-4 flex items-center justify-center cursor-pointer ${payment.payment_method === 'card' ? 'border-gray-500 bg-gray-50' : 'border-gray-200'}`}>
                  <PaymentMethodIcon method="card" />
                </div>
              </div>
              
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-colors"
              >
                {processing ? '支付处理中...' : `确认支付 ¥${order.total_amount.toFixed(2)}`}
              </button>
              
              <p className="mt-4 text-xs text-gray-500 text-center">
                点击"确认支付"即表示您同意支付上述金额，完成订单支付流程。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 