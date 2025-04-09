import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  userRoles: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshSession: () => Promise<void>;
  checkUserRole: (role: string) => boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 超级管理员邮箱常量
const SUPERADMIN_EMAIL = 'admin@sijoer.com';

// 创建Provider组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 刷新会话方法
  const refreshSession = async () => {
    console.log('手动刷新会话...');
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      console.log('刷新会话结果:', data.session ? '成功' : '无活动会话');
      setSession(data.session);
      setUser(data.session?.user || null);
      
      if (data.session) {
        localStorage.setItem('sijoer-auth-session', JSON.stringify(data.session));
      } else {
        localStorage.removeItem('sijoer-auth-session');
      }

      if (data.session?.user) {
        await fetchUserRoles(data.session.user.id);
      }
    } catch (err) {
      console.error('刷新会话失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 直接检查当前会话信息并更新超级管理员状态
  const checkAndUpdateSuperAdmin = (currentUser: User | null) => {
    const isSuperAdminUser = currentUser?.email === SUPERADMIN_EMAIL;
    console.log(`超级管理员检查: ${currentUser?.email} === ${SUPERADMIN_EMAIL} = ${isSuperAdminUser}`);
    
    setIsSuperAdmin(isSuperAdminUser);
    
    // 如果是超级管理员，同时也设置为普通管理员
    if (isSuperAdminUser) {
      setIsAdmin(true);
    }
    
    return isSuperAdminUser;
  };

  // 尝试从本地存储恢复会话，加速初始渲染
  useEffect(() => {
    console.log('AuthContext: 初始化认证状态...');
    
    // 立即尝试从localStorage获取缓存的会话
    const cachedSession = localStorage.getItem('sijoer-auth-session');
    
    const initFromCache = () => {
      if (cachedSession) {
        try {
          const parsedSession = JSON.parse(cachedSession);
          if (parsedSession && new Date(parsedSession.expires_at * 1000) > new Date()) {
            console.log('AuthContext: 从缓存加载会话, 用户ID:', parsedSession.user?.id);
            setSession(parsedSession);
            setUser(parsedSession.user || null);
            
            // 立即检查超级管理员状态
            checkAndUpdateSuperAdmin(parsedSession.user);
            
            // 如果有缓存的用户角色，也读取它
            const cachedRoles = localStorage.getItem('sijoer-user-roles');
            if (cachedRoles) {
              try {
                setUserRoles(JSON.parse(cachedRoles));
                setIsAdmin(JSON.parse(cachedRoles).includes('admin'));
              } catch (e) {
                console.error('AuthContext: 解析缓存角色出错:', e);
              }
            }
            
            return true;
          } else {
            console.log('AuthContext: 缓存会话已过期');
          }
        } catch (e) {
          console.error('AuthContext: 解析缓存会话出错:', e);
        }
      } else {
        console.log('AuthContext: 未找到缓存会话');
      }
      return false;
    };

    // 先从缓存初始化
    const initSuccess = initFromCache();
    
    // 设置一个标志来避免重复设置加载状态
    let isMounted = true;
    
    // 函数用于获取最新会话
    const getLatestSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('AuthContext: 获取会话失败:', error);
          setLoading(false);
          return;
        }
        
        console.log('AuthContext: 服务器会话状态:', session ? '已登录' : '未登录');
        
        setSession(session);
        setUser(session?.user || null);
        
        // 检查超级管理员状态
        checkAndUpdateSuperAdmin(session?.user || null);
        
        // 更新缓存
        if (session) {
          localStorage.setItem('sijoer-auth-session', JSON.stringify(session));
          if (session.user) {
            await fetchUserRoles(session.user.id);
          }
        } else {
          localStorage.removeItem('sijoer-auth-session');
          localStorage.removeItem('sijoer-user-roles');
        }
      } catch (err) {
        console.error('获取会话时出错:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // 如果缓存已成功初始化，延迟获取最新会话以避免阻塞渲染
    if (initSuccess) {
      setLoading(false);
      // 延迟获取最新会话，减少初始加载压力
      setTimeout(() => {
        if (isMounted) getLatestSession();
      }, 2000);
    } else {
      // 如果缓存未成功初始化，立即获取会话
      getLatestSession();
    }

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      
      console.log('AuthContext: 认证状态变化:', _event, session ? '有会话' : '无会话');
      setSession(session);
      setUser(session?.user || null);
      setIsAuthenticated(!!session?.user);
      
      // 无会话时重置所有状态
      if (!session) {
        setUserRoles([]);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        localStorage.removeItem('sijoer-auth-session');
        localStorage.removeItem('sijoer-user-roles');
        return;
      }
      
      // 立即检查超级管理员状态
      checkAndUpdateSuperAdmin(session?.user || null);
      
      // 更新缓存
      if (session) {
        localStorage.setItem('sijoer-auth-session', JSON.stringify(session));
        if (session.user) {
          await fetchUserRoles(session.user.id);
        }
      } else {
        localStorage.removeItem('sijoer-auth-session');
        localStorage.removeItem('sijoer-user-roles');
      }
      
      setLoading(false);
    });

    // 清理订阅和mounted标志
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchUserRoles(userId: string) {
    try {
      // 先尝试从缓存获取角色信息
      const cachedRoles = localStorage.getItem('sijoer-user-roles');
      if (cachedRoles) {
        const roles = JSON.parse(cachedRoles);
        setUserRoles(roles);
        // 如果是管理员角色，设置isAdmin为true
        const hasAdminRole = roles.includes('admin');
        setIsAdmin(hasAdminRole);
        console.log('从缓存读取角色:', roles, '是否管理员:', hasAdminRole);
      }
      
      // 然后从服务器获取最新角色
      const { data, error } = await supabase
        .from('user_role_names')
        .select('role_name')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const roles = data?.map(item => item.role_name) || [];
      const hasAdminRole = roles.includes('admin');
      
      setUserRoles(roles);
      setIsAdmin(hasAdminRole || user?.email === SUPERADMIN_EMAIL);
      
      console.log('角色检查:', roles, '用户邮箱:', user?.email, '是否管理员:', hasAdminRole || user?.email === SUPERADMIN_EMAIL);
      
      // 缓存角色信息到本地存储
      localStorage.setItem('sijoer-user-roles', JSON.stringify(roles));
      
      // 超级管理员判断
      if (user?.email === SUPERADMIN_EMAIL) {
        console.log('超级管理员账号');
        setIsSuperAdmin(true);
        setIsAdmin(true);
      }
      
      return roles;
    } catch (error) {
      console.error('获取用户角色失败:', error);
      
      // 如果出错，检查是否超级管理员
      if (user?.email === SUPERADMIN_EMAIL) {
        setIsSuperAdmin(true);
        setIsAdmin(true);
      }
      
      return userRoles;
    }
  }

  const checkUserRole = (role: string): boolean => {
    // 超级管理员拥有所有角色
    if (user?.email === SUPERADMIN_EMAIL) return true;
    return userRoles.includes(role);
  };

  // 构造上下文值
  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!session?.user,
    userRoles,
    isAdmin,
    isSuperAdmin,
    refreshSession,
    checkUserRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 导出使用上下文的钩子
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 