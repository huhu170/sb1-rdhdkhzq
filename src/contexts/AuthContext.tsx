import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false
});

// 创建Provider组件
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 尝试从本地存储恢复会话，加速初始渲染
  useEffect(() => {
    // 立即尝试从localStorage获取缓存的会话
    const cachedSession = localStorage.getItem('sijoer-auth-session');
    if (cachedSession) {
      try {
        const parsedSession = JSON.parse(cachedSession);
        if (parsedSession && new Date(parsedSession.expires_at * 1000) > new Date()) {
          setSession(parsedSession);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error parsing cached session:', e);
      }
    }

    // 无论是否有缓存，都从服务器获取最新状态
    supabase.auth.getSession().then(({ data: { session } }) => {
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
    isAuthenticated: !!session?.user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 导出使用上下文的钩子
export const useAuth = () => useContext(AuthContext); 