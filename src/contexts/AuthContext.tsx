import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  refreshSession: async () => {}
});

// 创建Provider组件
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 刷新会话方法
  const refreshSession = async () => {
    console.log('手动刷新会话...');
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      console.log('刷新会话结果:', data.session ? '成功' : '无活动会话');
      setSession(data.session);
      
      if (data.session) {
        localStorage.setItem('sijoer-auth-session', JSON.stringify(data.session));
      } else {
        localStorage.removeItem('sijoer-auth-session');
      }
    } catch (err) {
      console.error('刷新会话失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 尝试从本地存储恢复会话，加速初始渲染
  useEffect(() => {
    console.log('AuthContext: 初始化认证状态...');
    
    // 立即尝试从localStorage获取缓存的会话
    const cachedSession = localStorage.getItem('sijoer-auth-session');
    if (cachedSession) {
      try {
        const parsedSession = JSON.parse(cachedSession);
        if (parsedSession && new Date(parsedSession.expires_at * 1000) > new Date()) {
          console.log('AuthContext: 从缓存加载会话, 用户ID:', parsedSession.user?.id);
          setSession(parsedSession);
          setLoading(false);
        } else {
          console.log('AuthContext: 缓存会话已过期');
        }
      } catch (e) {
        console.error('AuthContext: 解析缓存会话出错:', e);
      }
    } else {
      console.log('AuthContext: 未找到缓存会话');
    }

    // 无论是否有缓存，都从服务器获取最新状态
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('AuthContext: 获取会话失败:', error);
      } else {
        console.log('AuthContext: 服务器会话状态:', session ? '已登录' : '未登录');
      }
      
      setSession(session);
      setLoading(false);
      
      // 更新缓存
      if (session) {
        localStorage.setItem('sijoer-auth-session', JSON.stringify(session));
      } else {
        localStorage.removeItem('sijoer-auth-session');
      }
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthContext: 认证状态变化:', _event, session ? '有会话' : '无会话');
      setSession(session);
      setLoading(false);
      
      // 更新缓存
      if (session) {
        localStorage.setItem('sijoer-auth-session', JSON.stringify(session));
      } else {
        localStorage.removeItem('sijoer-auth-session');
      }
    });

    // 清理订阅
    return () => subscription.unsubscribe();
  }, []);

  // 构造上下文值
  const value = {
    session,
    user: session?.user || null,
    loading,
    isAuthenticated: !!session?.user,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 导出使用上下文的钩子
export const useAuth = () => useContext(AuthContext); 