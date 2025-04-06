import React, { useEffect, useState } from 'react';
import { supabase, handleSupabaseError, retryOperation } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Package, MapPin, LogOut } from 'lucide-react';

interface UserProfile {
  display_name: string;
  phone: string;
  avatar_url: string | null;
  status: string;
  last_login_at: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: '/profile' } });
      return;
    }

    fetchUserData();
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user profile
      const { data: profileData, error: profileError } = await retryOperation(async () => {
        return await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user?.id)
          .maybeSingle();
      });

      if (profileError) throw profileError;

      // 如果用户资料不存在，则创建一个新的资料
      if (!profileData) {
        console.log('用户资料不存在，正在创建新资料...');
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user?.id,
            display_name: user?.email?.split('@')[0] || '用户',
            phone: '',
            avatar_url: null,
            status: 'active',
            last_login_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(profileData);
      }

      // Fetch recent orders
      const { data: orderData, error: orderError } = await retryOperation(async () => {
        return await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(5);
      });

      if (orderError) throw orderError;

      setRecentOrders(orderData || []);
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching user data');
      setError(handledError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'logging out');
      setError(handledError.message);
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
        {error && (
          <div className="mb-8 bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              {/* User Info */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile?.display_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {profile?.display_name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{profile?.phone}</p>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <a
                  href="#orders"
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  <Package className="w-5 h-5 mr-3" />
                  我的订单
                </a>
                <a
                  href="#addresses"
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  <MapPin className="w-5 h-5 mr-3" />
                  收货地址
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  退出登录
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow" id="orders">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">最近订单</h3>
                {recentOrders.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="py-4">
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无订单记录
                  </div>
                )}
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">账号设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      显示名称
                    </label>
                    <input
                      type="text"
                      value={profile?.display_name || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      手机号码
                    </label>
                    <input
                      type="tel"
                      value={profile?.phone || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      readOnly
                    />
                  </div>
                  <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    修改信息
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}