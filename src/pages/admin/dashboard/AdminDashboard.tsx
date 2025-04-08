import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSeoData, SeoData, getDailyStats } from '../../../lib/seo-utils';
import { LayoutDashboard, Users, Eye, BarChart, Globe, Search, RefreshCw, TrendingUp, Clock, ThumbsUp } from 'lucide-react';

// 定义用户数据接口
interface UserData {
  id: string;
  display_name: string | null;
  created_at: string;
}

interface DashboardData {
  userCount: number;
  recentUsers: UserData[];
  seoData: SeoData;
  dailyStats: { date: string, count: number }[];
}

const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    userCount: 0,
    recentUsers: [],
    seoData: {
      pageViews: 0,
      uniqueVisitors: 0,
      topKeywords: [],
      regionData: [],
      deviceData: [],
      bounceRate: 0
    },
    dailyStats: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTime, setRefreshTime] = useState<string>(new Date().toLocaleString('zh-CN'));
  
  // 获取核心数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始获取数据看板数据...');
      
      // 1. 前台用户数据
      const { data: recentUsers, error: recentUsersError } = await supabase
        .from('dashboard_users')
        .select('id, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (recentUsersError) {
        console.error('获取前台用户数据失败:', recentUsersError);
        throw recentUsersError;
      }
      
      // 2. 前台用户总数
      const { count: userCount, error: userCountError } = await supabase
        .from('dashboard_users')
        .select('id', { count: 'exact', head: true });
      
      if (userCountError) {
        console.error('获取前台用户总数失败:', userCountError);
        throw userCountError;
      }
      
      // 3. 获取SEO数据
      const seoData = getSeoData();
      
      // 4. 获取每日访问统计
      const dailyStats = getDailyStats();
      
      // 设置所有数据
      setDashboardData({
        userCount: userCount || 0,
        recentUsers: recentUsers || [],
        seoData,
        dailyStats
      });
      
      // 更新刷新时间
      setRefreshTime(new Date().toLocaleString('zh-CN'));
      
      console.log('数据看板数据加载完成');
    } catch (err: any) {
      console.error('获取数据看板数据失败:', err.message);
      setError(`获取数据失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 首次加载获取数据
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <LayoutDashboard className="mr-2" />
          数据看板
        </h1>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={16} />
          刷新数据
        </button>
      </div>
      
      <div className="mb-4 text-sm text-gray-500 flex items-center">
        <Clock size={16} className="mr-1" />
        <span>最后更新: {refreshTime}</span>
      </div>
      
      {loading && !dashboardData.userCount ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-500">加载中...</div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      ) : (
        <>
          {/* 核心数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 用户总数 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">用户总数</p>
                  <p className="text-3xl font-bold">{dashboardData.userCount}</p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Users className="text-blue-500" />
                </div>
              </div>
            </div>
            
            {/* 总访问量 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">总访问量</p>
                  <p className="text-3xl font-bold">{dashboardData.seoData.pageViews}</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <Eye className="text-green-500" />
                </div>
              </div>
            </div>
            
            {/* 独立访客 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">独立访客</p>
                  <p className="text-3xl font-bold">{dashboardData.seoData.uniqueVisitors}</p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <ThumbsUp className="text-purple-500" />
                </div>
              </div>
            </div>
            
            {/* 跳出率 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">跳出率</p>
                  <p className="text-3xl font-bold">{dashboardData.seoData.bounceRate}%</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <RefreshCw className="text-red-500" />
                </div>
              </div>
            </div>
          </div>
          
          {/* 访问趋势 */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center mb-4">
              <TrendingUp className="text-gray-700 mr-2" size={20} />
              <h2 className="text-lg font-semibold">访问趋势 (最近30天)</h2>
            </div>
            <div className="h-64">
              <div className="flex items-end h-48 space-x-1">
                {dashboardData.dailyStats.map((item, index) => {
                  const maxCount = Math.max(...dashboardData.dailyStats.map(s => s.count));
                  const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                      <div 
                        className="w-full bg-blue-500 rounded-t" 
                        style={{ height: `${height}%` }}
                        title={`${item.date}: ${item.count}次访问`}
                      ></div>
                      {index % 5 === 0 && (
                        <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left truncate w-12 text-center">
                          {item.date.split('-').slice(1).join('/')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* SEO相关信息 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 热门关键词 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Search className="text-gray-700 mr-2" size={20} />
                <h2 className="text-lg font-semibold">热门搜索关键词</h2>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关键词</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">搜索量</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">占比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData.seoData.topKeywords.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.keyword}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.count}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${Math.min(100, (item.count / Math.max(...dashboardData.seoData.topKeywords.map(k => k.count)) * 100))}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 访问地区分布 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Globe className="text-gray-700 mr-2" size={20} />
                <h2 className="text-lg font-semibold">访问地区分布</h2>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地区</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访问量</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">占比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData.seoData.regionData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.region}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.count}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full" 
                              style={{ width: `${Math.min(100, (item.count / Math.max(...dashboardData.seoData.regionData.map(r => r.count)) * 100))}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* 设备统计与跳出率 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 设备统计 */}
            <div className="bg-white rounded-lg shadow p-6 col-span-2">
              <div className="flex items-center mb-4">
                <BarChart className="text-gray-700 mr-2" size={20} />
                <h2 className="text-lg font-semibold">访问设备统计</h2>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备类型</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访问量</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">占比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData.seoData.deviceData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.device}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.count}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-purple-600 h-2.5 rounded-full" 
                              style={{ width: `${(item.count / dashboardData.seoData.deviceData.reduce((sum, d) => sum + d.count, 0) * 100).toFixed(1)}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 跳出率可视化 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <RefreshCw className="text-gray-700 mr-2" size={20} />
                <h2 className="text-lg font-semibold">跳出率</h2>
              </div>
              <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)]">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32">
                    <circle 
                      className="text-gray-200" 
                      strokeWidth="10" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="56" 
                      cx="64" 
                      cy="64"
                    />
                    <circle 
                      className="text-red-500" 
                      strokeWidth="10" 
                      strokeDasharray={`${dashboardData.seoData.bounceRate * 3.51}, 351`} 
                      strokeLinecap="round" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="56" 
                      cx="64" 
                      cy="64"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold">{dashboardData.seoData.bounceRate}%</span>
                </div>
                <p className="text-sm text-gray-500 mt-4">网站平均跳出率</p>
              </div>
            </div>
          </div>
          
          {/* 新注册用户 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">最近注册用户</h2>
            {dashboardData.recentUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData.recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.display_name || '未设置昵称'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">暂无用户数据</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard; 