import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase, handleSupabaseError, retryOperation } from '../../lib/supabase';
import { Truck, Package, ArrowLeft, Search, RefreshCw, AlertCircle, CheckCircle, Loader } from 'lucide-react';

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

// 模拟物流节点
const FAKE_TRACKING_NODES = [
  { status: '已揽收', time: '2023-04-20 10:23:45', location: '广州市白云区仓库' },
  { status: '运输中', time: '2023-04-20 16:42:12', location: '广州转运中心' },
  { status: '运输中', time: '2023-04-21 08:11:36', location: '已到达上海转运中心' },
  { status: '派送中', time: '2023-04-21 14:27:58', location: '上海市浦东新区' },
  { status: '已签收', time: '2023-04-21 17:45:20', location: '已签收，签收人: 王小明(本人签收)' },
];

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  tracking_number: string | null;
  shipping_company: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const { order_id } = useParams<{ order_id: string }>();
  
  const [trackingNumber, setTrackingNumber] = useState<string>(searchParams.get('tracking_number') || '');
  const [companyId, setCompanyId] = useState<string>(searchParams.get('company') || 'sf');
  const [orderNumber, setOrderNumber] = useState<string>(searchParams.get('order_number') || '');
  
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [trackingNodes, setTrackingNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState<boolean>(false);

  // 如果通过URL传递了订单ID，则直接查询订单
  useEffect(() => {
    if (order_id) {
      fetchOrderById(order_id);
    } else if (searchParams.get('tracking_number') && searchParams.get('company')) {
      // 如果URL包含物流号和物流公司，直接查询
      handleTrackSearch();
    }
  }, [order_id, searchParams]);

  // 通过订单ID查询订单
  const fetchOrderById = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .select('id, order_number, status, tracking_number, shipping_company, created_at, updated_at, user_id')
          .eq('id', orderId)
          .single();
      });
      
      if (error) throw error;
      
      setOrderDetail(data);
      
      if (data.tracking_number && data.shipping_company) {
        setTrackingNumber(data.tracking_number);
        setCompanyId(data.shipping_company);
        fetchTrackingInfo(data.tracking_number, data.shipping_company);
      } else {
        setError('该订单暂无物流信息');
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, '获取订单详情');
      setError(handledError.message);
    } finally {
      setLoading(false);
    }
  };

  // 通过订单号查询订单
  const fetchOrderByNumber = async (orderNum: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .select('id, order_number, status, tracking_number, shipping_company, created_at, updated_at, user_id')
          .eq('order_number', orderNum)
          .single();
      });
      
      if (error) throw error;
      
      setOrderDetail(data);
      
      if (data.tracking_number && data.shipping_company) {
        setTrackingNumber(data.tracking_number);
        setCompanyId(data.shipping_company);
        fetchTrackingInfo(data.tracking_number, data.shipping_company);
      } else {
        setError('该订单暂无物流信息');
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, '获取订单详情');
      setError(handledError.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取物流信息
  const fetchTrackingInfo = async (trackingNum: string, company: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // 实际项目中，这里应该调用物流API获取真实的物流信息
      // 这里使用模拟数据
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API请求延迟
      
      // 根据不同的物流公司和单号生成不同的假数据
      let fakeNodes = [...FAKE_TRACKING_NODES];
      
      // 调整日期为近期日期
      const now = new Date();
      fakeNodes = fakeNodes.map((node, index) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (fakeNodes.length - 1 - index));
        date.setHours(8 + index * 3);
        date.setMinutes(Math.floor(Math.random() * 60));
        return {
          ...node,
          time: date.toLocaleString()
        };
      });
      
      setTrackingNodes(fakeNodes);
      setSearched(true);
    } catch (err: any) {
      console.error('获取物流信息失败:', err);
      setError('获取物流信息失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 搜索物流
  const handleTrackSearch = () => {
    if (!trackingNumber.trim()) {
      setError('请输入物流单号');
      return;
    }
    
    if (orderNumber.trim()) {
      // 如果输入了订单号，优先查询订单信息
      fetchOrderByNumber(orderNumber.trim());
    } else {
      // 直接查询物流
      fetchTrackingInfo(trackingNumber.trim(), companyId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Truck className="w-6 h-6 mr-2" />
              物流查询
            </h1>
            <Link
              to="/"
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回首页
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            输入订单号或物流单号，查询您的包裹物流状态
          </p>
        </div>

        {/* 搜索表单 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="order_number" className="block text-sm font-medium text-gray-700 mb-1">
                订单号 (选填)
              </label>
              <input
                type="text"
                id="order_number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="请输入订单号"
              />
            </div>
            <div>
              <label htmlFor="shipping_company" className="block text-sm font-medium text-gray-700 mb-1">
                物流公司
              </label>
              <select
                id="shipping_company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {SHIPPING_COMPANIES.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="tracking_number" className="block text-sm font-medium text-gray-700 mb-1">
              物流单号
            </label>
            <div className="flex">
              <input
                type="text"
                id="tracking_number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="flex-1 border-gray-300 rounded-l-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="请输入物流单号"
              />
              <button
                onClick={handleTrackSearch}
                disabled={loading || (!trackingNumber.trim() && !orderNumber.trim())}
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center mt-4">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* 订单信息 */}
        {orderDetail && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">订单信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">订单号</p>
                <p className="font-medium">{orderDetail.order_number}</p>
              </div>
              <div>
                <p className="text-gray-500">下单时间</p>
                <p className="font-medium">{new Date(orderDetail.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">订单状态</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  orderDetail.status === 'shipped' 
                    ? 'bg-purple-100 text-purple-800'
                    : orderDetail.status === 'delivered'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {orderDetail.status === 'pending_payment' && '待付款'}
                  {orderDetail.status === 'pending_confirmation' && '待确认'}
                  {orderDetail.status === 'processing' && '处理中'}
                  {orderDetail.status === 'shipped' && '已发货'}
                  {orderDetail.status === 'delivered' && '已送达'}
                  {orderDetail.status === 'cancelled' && '已取消'}
                  {orderDetail.status === 'refunded' && '已退款'}
                </span>
              </div>
              <div>
                <p className="text-gray-500">物流单号</p>
                <p className="font-medium">{orderDetail.tracking_number || '暂无'}</p>
              </div>
            </div>
          </div>
        )}

        {/* 物流信息 */}
        {searched && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">物流跟踪</h2>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 mr-2">物流公司:</span>
                <span className="font-medium">
                  {SHIPPING_COMPANIES.find(c => c.id === companyId)?.name || '未知'}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {/* 物流信息头部 */}
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Truck className="w-8 h-8" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {trackingNodes.length > 0 && trackingNodes[trackingNodes.length - 1].status}
                  </h3>
                  <p className="text-sm text-gray-500">
                    物流单号: {trackingNumber}
                  </p>
                </div>
              </div>
              
              {/* 物流轨迹 */}
              <div className="border-l-2 border-indigo-200 ml-7 pl-8 space-y-6">
                {trackingNodes.map((node, index) => (
                  <div key={index} className="relative pb-6">
                    {/* 节点指示器 */}
                    <div className="absolute -left-10 top-0">
                      {index === trackingNodes.length - 1 ? (
                        <div className="w-4 h-4 bg-indigo-600 rounded-full border-2 border-white"></div>
                      ) : (
                        <div className="w-3 h-3 bg-indigo-200 rounded-full"></div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900">{node.status}</p>
                      <p className="text-sm text-gray-500">{node.time}</p>
                      <p className="text-sm text-gray-700 mt-1">{node.location}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fetchTrackingInfo(trackingNumber, companyId)}
                  disabled={loading}
                  className="flex items-center text-indigo-600 hover:text-indigo-800"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新物流信息
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 