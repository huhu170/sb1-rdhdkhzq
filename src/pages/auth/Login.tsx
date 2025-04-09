import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { handleAuthError } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();

  // Handle automatic redirects based on authentication state
  useEffect(() => {
    // 只在未处于加载状态、未正在重定向且已认证的情况下进行重定向
    if (isAuthenticated && !authLoading && !redirecting) {
      // 防止重复重定向
      setRedirecting(true);
      console.log('用户已登录，准备重定向');
      
      // 确定登录页面类型
      const isAdminLogin = location.pathname === '/admin/login';
      
      console.log('用户是否管理员:', isAdmin);

      // 使用setTimeout确保重定向在下一个事件循环中执行
      setTimeout(() => {
        if (isAdminLogin) {
          if (isAdmin) {
            console.log('管理员从管理员登录页登录，重定向到管理后台');
            navigate('/admin/dashboard', { replace: true });
          } else {
            console.log('非管理员用户从管理员登录页登录，重定向到首页');
            navigate('/', { replace: true });
          }
        } else {
          // 从普通登录页登录，普通用户直接到首页
          console.log('从普通登录页登录，重定向到首页');
          navigate('/', { replace: true });
        }
      }, 300); // 延长延迟时间，确保状态更新
    }
  }, [isAuthenticated, authLoading, redirecting, navigate, location.pathname, isAdmin]);

  // Handle messages and errors from navigation state
  useEffect(() => {
    const state = location.state as { message?: string };
    setMessage(state?.message || null);
    setError(null); // Clear any existing errors
  }, [location]);

  const verifyAdminRole = async () => {
    try {
      console.log('开始验证管理员权限');
      
      // 先获取当前登录用户信息
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.id) {
        console.error('获取用户信息失败');
        throw new Error('获取用户信息失败');
      }
      
      console.log('当前登录用户ID:', user.id, '邮箱:', user.email);
      
      // 检查超级管理员 (直接通过邮箱判断)
      if (user.email === 'admin@sijoer.com') {
        console.log('超级管理员账号，直接授权访问');
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      
      try {
        // 查询用户资料中的account_type
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('account_type')
          .eq('id', user.id)
          .single();
        
        if (userError) {
          console.error('获取用户信息失败:', userError);
          // 不立即抛出错误，继续尝试其他方法
        } else {
          console.log('用户资料:', userData);
          
          // 检查账号类型
          if (userData && userData.account_type === 'admin') {
            console.log('管理员账号类型验证成功');
            navigate('/admin/dashboard', { replace: true });
            return;
          }
        }
      } catch (err) {
        console.error('查询用户资料失败:', err);
        // 继续尝试其他方法
      }
      
      try {
        // 再检查角色表，兼容旧数据
        const { data: roleData, error: roleError } = await supabase
          .from('user_role_names')
          .select('role_name')
          .eq('user_id', user.id)
          .eq('role_name', 'admin')
          .maybeSingle(); // 使用maybeSingle代替single，防止无结果时抛出错误
        
        console.log('角色验证结果:', roleData, roleError);
        
        if (!roleError && roleData && roleData.role_name === 'admin') {
          console.log('通过角色验证成功');
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      } catch (err) {
        console.error('查询角色信息失败:', err);
        // 继续尝试其他方法
      }
      
      // 最后尝试通过直接查询user_roles表验证
      try {
        const { data: userRoleData, error: userRoleError } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id);
        
        if (!userRoleError && userRoleData && userRoleData.length > 0) {
          // 查找该用户的所有角色
          const roleIds = userRoleData.map(ur => ur.role_id);
          
          // 获取角色名称
          const { data: rolesData, error: rolesError } = await supabase
            .from('roles')
            .select('name')
            .in('id', roleIds);
          
          if (!rolesError && rolesData) {
            // 检查是否包含admin角色
            const isAdmin = rolesData.some(r => r.name === 'admin');
            
            if (isAdmin) {
              console.log('通过直接查询用户角色表验证成功');
              navigate('/admin/dashboard', { replace: true });
              return;
            }
          }
        }
      } catch (err) {
        console.error('直接查询角色表失败:', err);
      }
      
      // 所有验证都失败，不是管理员
      console.log('验证失败，不是管理员账号');
      await supabase.auth.signOut();
      setError('您的账号没有权限访问管理后台');
    } catch (err) {
      console.error('验证管理员权限失败:', err);
      setError('验证管理员权限失败');
      
      // 清除会话
      await supabase.auth.signOut();
      localStorage.removeItem('sijoer-auth-session');
    }
  };

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      throw new Error('请输入邮箱和密码');
    }

    if (!email.includes('@')) {
      throw new Error('请输入有效的邮箱地址');
    }

    if (password.length < 6) {
      throw new Error('密码长度至少为6位');
    }

    if (attempts >= 5) {
      throw new Error('登录尝试次数过多，请稍后再试');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      validateForm();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('登录失败，请稍后重试');
      }

      // Login successful - redirection will be handled by the useEffect hook
      // that watches isAuthenticated
    } catch (err: any) {
      console.error('Login error:', err);
      setError(handleAuthError(err));
      setAttempts(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {location.pathname === '/admin/login' ? '管理员登录' : '登录账号'}
          </h2>
          {location.pathname !== '/admin/login' && (
            <p className="mt-2 text-center text-sm text-gray-600">
              还没有账号？{' '}
              <Link
                to="/auth/register"
                state={location.state}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                立即注册
              </Link>
            </p>
          )}
        </div>

        {message && (
          <div className="bg-green-50 text-green-800 p-4 rounded-md text-sm flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md text-sm flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请输入邮箱地址"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || attempts >= 5}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          {location.pathname === '/admin/login' && (
            <div className="mt-4 text-sm text-gray-600">
              <p>测试账号：</p>
              <p>邮箱：admin@sijoer.com</p>
              <p>密码：sijoer2024</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}