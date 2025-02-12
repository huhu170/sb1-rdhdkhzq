import React, { useEffect, useState } from 'react';
import { supabase, handleSupabaseError, retryOperation } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to be checked
    if (authLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/auth/login', { 
        state: { from: '/orders' },
        replace: true 
      });
      return;
    }

    // Fetch orders if authenticated
    fetchOrders();
  }, [isAuthenticated, authLoading]);

  const fetchOrders = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
      }
      setError(null);

      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });
      });

      if (error) throw error;

      if (data) {
        setOrders(data);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching orders');
      setError(handledError.message);
      
      // Implement exponential backoff for retries
      if (retryCount < 3) {
        setRetrying(true);
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          setRetrying(false);
          fetchOrders(true);
        }, delay);
      }
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  };

  // Show loading state while checking auth
  if (authLoading || loading) {
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">我的订单</h1>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 text-red-500 p-4 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
              {retrying && (
                <span className="ml-2 text-sm text-gray-500 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  正在重试 ({retryCount}/3)
                </span>
              )}
            </div>
            {!retrying && (
              <button
                onClick={() => fetchOrders()}
                className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                重新加载
              </button>
            )}
          </div>
        )}

        {orders.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        订单号：{order.order_number}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        下单时间：{new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ¥{order.total_amount.toFixed(2)}
                      </p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无订单</h3>
            <p className="mt-1 text-sm text-gray-500">
              您还没有任何订单记录
            </p>
          </div>
        )}
      </div>
    </div>
  );
}