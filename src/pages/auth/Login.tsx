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
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Handle automatic redirects based on authentication state
  useEffect(() => {
    // 只在未处于加载状态、未正在重定向且已认证的情况下进行重定向
    if (isAuthenticated && !authLoading && !redirecting) {
      // 防止重复重定向
      setRedirecting(true);
      
      // 使用location.state获取原始请求的页面路径
      const state = location.state as { from?: string };
      const isAdminLogin = location.pathname === '/admin/login';

      if (isAdminLogin) {
        // 管理员登录页处理
        verifyAdminRole();
      } else {
        // 普通用户登录处理
        const redirectTo = state?.from || '/';
        console.log('Redirecting authenticated user to:', redirectTo);
        
        // 使用replace而不是push避免历史记录堆积
        // 添加一个简短的延迟，确保DOM完全更新
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 10);
      }
    }
  }, [isAuthenticated, authLoading, redirecting, location.pathname, navigate, location.state]);

  // Handle messages and errors from navigation state
  useEffect(() => {
    const state = location.state as { message?: string };
    setMessage(state?.message || null);
    setError(null); // Clear any existing errors
  }, [location]);

  const verifyAdminRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_role_names')
        .select('role_name')
        .eq('role_name', 'admin')
        .single();

      if (error || !data) {
        // Not an admin, sign out and show error
        await supabase.auth.signOut();
        setError('无权限访问管理后台');
        return;
      }

      // Is admin, redirect to dashboard
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Error verifying admin role:', err);
      setError('验证管理员权限失败');
      await supabase.auth.signOut();
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