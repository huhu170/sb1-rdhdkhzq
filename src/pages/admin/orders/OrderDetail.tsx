import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, handleSupabaseError, retryOperation } from '../../../lib/supabase';
import { ArrowLeft, Package, Truck, Check, X, AlertCircle, User, RefreshCw, FileText, MapPin, DollarSign, Tag } from 'lucide-react';

// 订单状态中文映射
const ORDER_STATUS_MAP: Record<string, string> = {
  'pending_payment': '待付款',
  'pending_confirmation': '待确认',
  'processing': '处理中',
  'shipped': '已发货',
  'delivered': '已送达',
  'cancelled': '已取消',
  'refunded': '已退款'
};

// 订单状态颜色映射
const STATUS_COLOR_MAP: Record<string, string> = {
  'pending_payment': 'bg-yellow-100 text-yellow-800',
  'pending_confirmation': 'bg-blue-100 text-blue-800',
  'processing': 'bg-indigo-100 text-indigo-800',
  'shipped': 'bg-purple-100 text-purple-800',
  'delivered': 'bg-green-100 text-green-800',
  'cancelled': 'bg-red-100 text-red-800',
  'refunded': 'bg-gray-100 text-gray-800'
};

// 物流公司列表
const SHIPPING_COMPANIES = [
  { id: 'sf', name: '顺丰速运' },
  { id: 'sto', name: '申通快递' },
  { id: 'yt', name: '圆通速递' },
  { id: 'yd', name: '韵达快递' },
  { id: 'zto', name: '中通快递' },
  { id: 'yunda', name: '韵达快递' },
  { id: 'jd', name: '京东物流' },
  { id: 'ems', name: 'EMS' },
  { id: 'other', name: '其他' }
];

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  tracking_number: string | null;
  shipping_company: string | null;
  shipping_address_id: string;
  shipping_fee: number;
  notes: string | null;
  user: {
    email: string;
  } | null;
  shipping_address: {
    recipient_name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    street_address: string;
    postal_code: string;
  } | null;
  payment_records: {
    id: string;
    status: string;
    payment_method: string;
    amount: number;
    created_at: string;
  }[];
  order_items: {
    id: string;
    product_id: string;
    product_name: string;
    product_price: number;
    quantity: number;
    customization: any;
  }[];
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showShippingForm = searchParams.get('action') === 'ship';
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shippingCompany, setShippingCompany] = useState('sf');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [shipSuccess, setShipSuccess] = useState(false);

  // 获取订单详情
  const fetchOrderDetail = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 1. 先获取订单基本信息
      const { data: orderData, error: orderError } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();
      });
      
      if (orderError) throw orderError;
      
      if (!orderData) {
        setError('无法找到订单信息');
        setLoading(false);
        return;
      }
      
      // 2. 并行获取关联数据
      const [
        { data: userData, error: userError },
        { data: addressData, error: addressError },
        { data: paymentData, error: paymentError },
        { data: orderItemsData, error: orderItemsError }
      ] = await Promise.all([
        // 获取用户信息
        orderData.user_id ? 
          retryOperation(async () => supabase.from('users').select('*').eq('id', orderData.user_id).single()) : 
          Promise.resolve({ data: null, error: null }),
        
        // 获取地址信息
        orderData.shipping_address_id ? 
          retryOperation(async () => supabase.from('shipping_addresses').select('*').eq('id', orderData.shipping_address_id).single()) : 
          Promise.resolve({ data: null, error: null }),
        
        // 获取支付信息
        retryOperation(async () => supabase.from('payment_records').select('*').eq('order_id', id)),
        
        // 获取订单商品
        retryOperation(async () => supabase.from('order_items').select('*').eq('order_id', id))
      ]);
      
      if (userError) console.warn('获取用户数据出错:', userError.message);
      if (addressError) console.warn('获取地址数据出错:', addressError.message);
      if (paymentError) console.warn('获取支付数据出错:', paymentError.message);
      if (orderItemsError) console.warn('获取订单商品出错:', orderItemsError.message);
      
      // 3. 组装完整订单数据
      const orderDetail = {
        ...orderData,
        user: userData,
        shipping_address: addressData,
        payment_records: paymentData || [],
        order_items: orderItemsData || []
      };
      
      setOrder(orderDetail as OrderDetail);
      
      // 如果已有物流信息，初始化表单
      if (orderData) {
        if (orderData.tracking_number) {
          setTrackingNumber(orderData.tracking_number);
        }
        if (orderData.shipping_company) {
          setShippingCompany(orderData.shipping_company);
        }
        if (orderData.notes) {
          setNotes(orderData.notes);
        }
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, '获取订单详情');
      setError(handledError.message);
    } finally {
      setLoading(false);
    }
  };

  // 添加订单状态与支付状态同步的逻辑
  const syncOrderWithPayment = async () => {
    if (!order || !id) return;
    
    const paymentStatus = order.payment_records?.[0]?.status;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // 检查状态是否需要同步
      if (paymentStatus === 'success' && order.status === 'pending_payment') {
        const { error: updateError } = await retryOperation(async () => {
          return await supabase
            .from('orders')
            .update({
              status: 'pending_confirmation',
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
        });
        
        if (updateError) throw updateError;
        
        // 刷新订单数据
        await fetchOrderDetail();
        
        return true;
      }
      
      return false;
    } catch (err: any) {
      const handledError = handleSupabaseError(err, '同步订单状态');
      setError(handledError.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // 增强订单状态显示部分，添加状态同步按钮
  const renderOrderStatus = () => {
    if (!order) return null;
    
    const paymentStatus = order.payment_records?.[0]?.status;
    const needsSync = paymentStatus === 'success' && order.status === 'pending_payment';
    
    return (
      <div>
        <p className="text-sm text-gray-500">订单状态</p>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR_MAP[order.status] || 'bg-gray-100 text-gray-800'}`}>
            {ORDER_STATUS_MAP[order.status] || order.status}
          </span>
          
          {needsSync && (
            <button
              onClick={syncOrderWithPayment}
              disabled={submitting}
              className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800"
              title="已支付订单自动更新状态"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${submitting ? 'animate-spin' : ''}`} />
              同步状态
            </button>
          )}
          
          <div className="relative">
            <select
              className="text-xs border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={order.status}
              onChange={(e) => handleStatusUpdate(e.target.value)}
              disabled={submitting}
            >
              <option value="pending_payment">待付款</option>
              <option value="pending_confirmation">待确认</option>
              <option value="processing">处理中</option>
              <option value="shipped">已发货</option>
              <option value="delivered">已送达</option>
              <option value="cancelled">已取消</option>
              <option value="refunded">已退款</option>
            </select>
            {submitting && (
              <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center">
                <RefreshCw className="animate-spin h-4 w-4 text-indigo-600" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 订单发货逻辑增强
  const handleShipOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingNumber.trim()) {
      setError('请输入物流单号');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // 先检查订单支付状态
      const paymentStatus = order?.payment_records?.[0]?.status;
      if (paymentStatus !== 'success') {
        setError('该订单尚未支付，无法发货');
        return;
      }
      
      // 更新订单状态为已发货，同时添加物流信息
      const { error: updateError } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .update({
            status: 'shipped',
            tracking_number: trackingNumber.trim(),
            shipping_company: shippingCompany,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      });
      
      if (updateError) throw updateError;
      
      setShipSuccess(true);
      
      // 3秒后重定向回订单详情页
      setTimeout(() => {
        navigate(`/admin/dashboard/orders/${id}`);
      }, 3000);
    } catch (err: any) {
      const handledError = handleSupabaseError(err, '更新发货信息');
      setError(handledError.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 订单状态更新
  const handleStatusUpdate = async (newStatus: string) => {
    if (!order || !id) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const { error: updateError } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      });
      
      if (updateError) throw updateError;
      
      // 刷新订单数据
      fetchOrderDetail();
    } catch (err: any) {
      const handledError = handleSupabaseError(err, '更新订单状态');
      setError(handledError.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 如果没有找到订单
  if (!order && !loading) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>无法找到订单信息</span>
      </div>
    );
  }

  // 显示发货表单
  if (showShippingForm && order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(`/admin/dashboard/orders/${id}`)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 ml-2">发货管理</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            {error}
          </div>
        )}

        {shipSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
            <Check className="w-5 h-5 mr-2 text-green-500" />
            发货成功！订单状态已更新为已发货。页面将在3秒后自动跳转...
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">订单基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">订单号</p>
                <p className="text-sm font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">创建时间</p>
                <p className="text-sm font-medium">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">订单状态</p>
                {renderOrderStatus()}
              </div>
              <div>
                <p className="text-sm text-gray-500">支付状态</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  order.payment_records[0]?.status === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.payment_records[0]?.status === 'success' ? '已支付' : '未支付'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleShipOrder} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">物流信息</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="shipping-company" className="block text-sm font-medium text-gray-700 mb-1">
                    物流公司
                  </label>
                  <select
                    id="shipping-company"
                    value={shippingCompany}
                    onChange={(e) => setShippingCompany(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {SHIPPING_COMPANIES.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="tracking-number" className="block text-sm font-medium text-gray-700 mb-1">
                    物流单号
                  </label>
                  <input
                    type="text"
                    id="tracking-number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="请输入物流单号"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    备注 (可选)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="添加订单备注信息（如特殊发货要求等）"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(`/admin/dashboard/orders/${id}`)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={submitting || shipSuccess}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    提交中...
                  </span>
                ) : '确认发货'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 订单详情显示
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to="/admin/dashboard/orders"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 ml-2">订单详情</h2>
        </div>
        <div className="flex space-x-2">
          {order && (order.status === 'pending_confirmation' || order.status === 'processing') && (
            <Link
              to={`/admin/dashboard/orders/${id}?action=ship`}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Truck className="h-4 w-4 mr-2" />
              发货
            </Link>
          )}
          <button
            onClick={() => fetchOrderDetail()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
          {error}
        </div>
      )}

      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 订单信息与客户信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 订单基本信息 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center">
                <FileText className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">订单信息</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">订单号</p>
                    <p className="text-sm font-medium">{order.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">下单时间</p>
                    <p className="text-sm font-medium">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">订单状态</p>
                    {renderOrderStatus()}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">支付状态</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.payment_records[0]?.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.payment_records[0]?.status === 'success' ? '已支付' : '未支付'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">支付方式</p>
                    <p className="text-sm font-medium">
                      {order.payment_records[0]?.payment_method === 'alipay' && '支付宝'}
                      {order.payment_records[0]?.payment_method === 'wechat' && '微信支付'}
                      {order.payment_records[0]?.payment_method === 'card' && '银行卡'}
                      {!order.payment_records[0]?.payment_method && '未知'}
                    </p>
                  </div>
                  {order.tracking_number && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">物流信息</p>
                      <div className="flex items-center mt-1">
                        <Truck className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium">
                          {SHIPPING_COMPANIES.find(c => c.id === order.shipping_company)?.name || '未知物流公司'}:
                          {' '}{order.tracking_number}
                        </span>
                      </div>
                    </div>
                  )}
                  {order.notes && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">备注</p>
                      <p className="text-sm font-medium">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 客户信息 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center">
                <User className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">客户信息</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">客户邮箱</p>
                    <p className="text-sm font-medium">{order.user?.email || '未知'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">客户ID</p>
                    <p className="text-sm font-medium">{order.user_id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 收货地址 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center">
                <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">收货地址</h3>
              </div>
              <div className="p-6">
                {order.shipping_address ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{order.shipping_address.recipient_name}</p>
                      <p className="text-sm">{order.shipping_address.phone}</p>
                    </div>
                    <p className="text-sm text-gray-700">
                      {order.shipping_address.province} {order.shipping_address.city} {order.shipping_address.district} {order.shipping_address.street_address}
                    </p>
                    <p className="text-sm text-gray-500">
                      邮编: {order.shipping_address.postal_code}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">没有收货地址信息</p>
                )}
              </div>
            </div>
            
            {/* 订单商品列表 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center">
                <Package className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">订单商品</h3>
              </div>
              <div className="p-6">
                <ul className="divide-y divide-gray-200">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="py-4 flex">
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{item.product_name}</h4>
                            {item.customization && Object.keys(item.customization).length > 0 && (
                              <div className="mt-1 text-sm text-gray-500">
                                {Object.entries(item.customization).map(([key, value]) => (
                                  <div key={key} className="flex items-center space-x-1">
                                    <Tag className="h-3 w-3" />
                                    <span>{key}: {typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              ¥{item.product_price.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">x{item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 金额汇总 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden sticky top-24">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center">
                <DollarSign className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">金额信息</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500">商品总额</p>
                    <p className="text-sm font-medium">
                      ¥{(order.total_amount - order.shipping_fee).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500">运费</p>
                    <p className="text-sm font-medium">
                      {order.shipping_fee > 0 ? `¥${order.shipping_fee.toFixed(2)}` : '免运费'}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-200 flex justify-between">
                    <p className="text-base font-medium text-gray-900">订单总额</p>
                    <p className="text-base font-medium text-indigo-600">
                      ¥{order.total_amount.toFixed(2)}
                    </p>
                  </div>
                  {order.payment_records.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">支付记录</h4>
                      {order.payment_records.map((payment, index) => (
                        <div key={payment.id} className={`${index > 0 ? 'mt-2 pt-2 border-t border-gray-100' : ''}`}>
                          <div className="flex justify-between">
                            <p className="text-sm text-gray-500">支付金额</p>
                            <p className="text-sm font-medium">¥{payment.amount.toFixed(2)}</p>
                          </div>
                          <div className="flex justify-between mt-1">
                            <p className="text-sm text-gray-500">支付时间</p>
                            <p className="text-sm">{new Date(payment.created_at).toLocaleString()}</p>
                          </div>
                          <div className="flex justify-between mt-1">
                            <p className="text-sm text-gray-500">支付状态</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payment.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.status === 'success' ? '成功' : payment.status === 'pending' ? '处理中' : '失败'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 