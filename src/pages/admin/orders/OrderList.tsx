import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, handleSupabaseError, retryOperation } from '../../../lib/supabase';
import { Search, RefreshCw, Eye, Truck, Package, Filter, Download, Calendar, AlertCircle } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  tracking_number: string | null;
  shipping_address_id: string;
  shipping_fee: number;
  user: {
    email: string;
  } | null;
  shipping_address: {
    recipient_name: string;
    phone: string;
  } | null;
  payment_records: {
    status: string;
    payment_method: string;
  }[];
}

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

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [loadingCount, setLoadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // 获取订单列表
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingCount(prev => prev + 1);

      // 1. 先获取订单基础数据
      const { data: orderData, error: orderError } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
      });

      if (orderError) throw orderError;
      
      if (!orderData || orderData.length === 0) {
        setOrders([]);
        setFilteredOrders([]);
        setLoading(false);
        return;
      }

      // 收集所有需要查询的ID
      const userIds = orderData.map(order => order.user_id).filter(Boolean);
      const addressIds = orderData.map(order => order.shipping_address_id).filter(Boolean);
      const orderIds = orderData.map(order => order.id);

      // 2. 并行查询关联数据
      const [
        { data: userData, error: userError },
        { data: addressData, error: addressError },
        { data: paymentData, error: paymentError }
      ] = await Promise.all([
        // 用户数据
        userIds.length > 0 
          ? retryOperation(async () => supabase.from('users').select('id, email').in('id', userIds))
          : Promise.resolve({ data: [], error: null }),
        
        // 地址数据
        addressIds.length > 0
          ? retryOperation(async () => supabase.from('shipping_addresses').select('id, recipient_name, phone').in('id', addressIds))
          : Promise.resolve({ data: [], error: null }),
        
        // 支付数据
        orderIds.length > 0
          ? retryOperation(async () => supabase.from('payment_records').select('order_id, status, payment_method').in('order_id', orderIds))
          : Promise.resolve({ data: [], error: null })
      ]);

      if (userError) console.warn('获取用户数据出错:', userError.message);
      if (addressError) console.warn('获取地址数据出错:', addressError.message);
      if (paymentError) console.warn('获取支付数据出错:', paymentError.message);

      // 3. 组装完整订单数据
      const enrichedOrders = orderData.map(order => {
        // 关联用户信息
        const user = userData?.find(u => u.id === order.user_id) || null;
        
        // 关联地址信息
        const shipping_address = addressData?.find(a => a.id === order.shipping_address_id) || null;
        
        // 关联支付记录
        const payment_records = paymentData?.filter(p => p.order_id === order.id) || [];

        return {
          ...order,
          user,
          shipping_address,
          payment_records
        };
      });

      setOrders(enrichedOrders);
      setFilteredOrders(enrichedOrders);
    } catch (err: any) {
      const handledError = handleSupabaseError(err, '获取订单列表');
      setError(handledError.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchOrders();
  }, []);

  // 处理过滤和搜索
  useEffect(() => {
    let result = [...orders];

    // 状态过滤
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    // 日期过滤
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          result = result.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= today;
          });
          break;
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          result = result.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= yesterday && orderDate < today;
          });
          break;
        }
        case 'last7days': {
          const last7Days = new Date(today);
          last7Days.setDate(last7Days.getDate() - 7);
          result = result.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= last7Days;
          });
          break;
        }
        case 'last30days': {
          const last30Days = new Date(today);
          last30Days.setDate(last30Days.getDate() - 30);
          result = result.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= last30Days;
          });
          break;
        }
      }
    }

    // 搜索
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.order_number.toLowerCase().includes(lowerCaseSearchTerm) ||
        (order.user?.email && order.user.email.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (order.shipping_address?.recipient_name && 
         order.shipping_address.recipient_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (order.shipping_address?.phone && 
         order.shipping_address.phone.includes(searchTerm)) ||
        (order.tracking_number && 
         order.tracking_number.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter, dateFilter]);

  // 导出订单数据
  const handleExportOrders = () => {
    let dataToExport = filteredOrders;
    
    // 转换为CSV格式
    const headers = ['订单号', '创建时间', '客户邮箱', '收件人', '联系电话', '支付状态', '订单状态', '金额', '物流单号'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(order => [
        order.order_number,
        new Date(order.created_at).toLocaleString(),
        order.user?.email || '未知',
        order.shipping_address?.recipient_name || '未知',
        order.shipping_address?.phone || '未知',
        order.payment_records[0]?.status === 'success' ? '已支付' : '未支付',
        ORDER_STATUS_MAP[order.status] || order.status,
        order.total_amount.toFixed(2),
        order.tracking_number || '未发货'
      ].join(','))
    ].join('\n');
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `订单数据_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 添加订单同步功能，检查并更新状态不一致的订单
  const syncOrderStatus = async (orderId: string, paymentStatus: string, currentOrderStatus: string) => {
    try {
      setSubmitting(true);
      
      // 如果支付成功但订单仍在"待付款"状态，则自动更新为"待确认"
      if (paymentStatus === 'success' && currentOrderStatus === 'pending_payment') {
        const { error } = await retryOperation(async () => {
          return await supabase
            .from('orders')
            .update({ 
              status: 'pending_confirmation',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
        });
        
        if (error) throw error;
        
        // 刷新订单列表
        fetchOrders();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('同步订单状态失败:', err);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染订单状态和支付状态
  const renderOrderStatuses = (order: Order) => {
    const paymentStatus = order.payment_records?.[0]?.status;
    
    return (
      <div className="flex flex-col space-y-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR_MAP[order.status] || 'bg-gray-100 text-gray-800'}`}>
          {ORDER_STATUS_MAP[order.status] || order.status}
        </span>
        
        {paymentStatus && (
          <span 
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              paymentStatus === 'success' 
                ? 'bg-green-100 text-green-800' 
                : paymentStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
            onClick={paymentStatus === 'success' && order.status === 'pending_payment' ? 
              () => syncOrderStatus(order.id, paymentStatus, order.status) : undefined}
            title={paymentStatus === 'success' && order.status === 'pending_payment' ? 
              '点击同步订单状态' : undefined}
            style={paymentStatus === 'success' && order.status === 'pending_payment' ? 
              {cursor: 'pointer'} : undefined}
          >
            {paymentStatus === 'success' ? '已支付' : 
             paymentStatus === 'pending' ? '待支付' : '支付失败'}
            
            {paymentStatus === 'success' && order.status === 'pending_payment' && (
              <RefreshCw className="w-3 h-3 ml-1" />
            )}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 标题和工具栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">订单管理</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={handleExportOrders}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            导出
          </button>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
          {error}
        </div>
      )}

      {/* 筛选工具 */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索订单号、客户、收件人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {/* 订单状态筛选 */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
            >
              <option value="all">所有状态</option>
              <option value="pending_payment">待付款</option>
              <option value="pending_confirmation">待确认</option>
              <option value="processing">处理中</option>
              <option value="shipped">已发货</option>
              <option value="delivered">已送达</option>
              <option value="cancelled">已取消</option>
              <option value="refunded">已退款</option>
            </select>
            <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {/* 时间筛选 */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
            >
              <option value="all">所有时间</option>
              <option value="today">今天</option>
              <option value="yesterday">昨天</option>
              <option value="last7days">最近7天</option>
              <option value="last30days">最近30天</option>
            </select>
            <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {/* 筛选结果统计 */}
          <div className="flex items-center justify-center sm:justify-end">
            <span className="text-sm text-gray-500">
              共 <span className="font-medium text-gray-900">{filteredOrders.length}</span> 条订单
            </span>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && loadingCount === 1 ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单信息
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客户信息
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金额
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.order_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                      {order.tracking_number && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Truck className="w-4 h-4 mr-1" />
                          {order.tracking_number}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.shipping_address?.recipient_name || '未知'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.shipping_address?.phone || '未知'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.user?.email || '未知'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ¥{order.total_amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        含运费: ¥{order.shipping_fee.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderOrderStatuses(order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/admin/dashboard/orders/${order.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        {(order.status === 'processing' || order.status === 'pending_confirmation') && (
                          <Link
                            to={`/admin/dashboard/orders/${order.id}?action=ship`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Truck className="w-5 h-5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无订单</h3>
            <p className="mt-1 text-sm text-gray-500">
              没有找到符合条件的订单记录
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 