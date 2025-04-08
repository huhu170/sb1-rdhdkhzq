import React, { ComponentType } from 'react';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

/**
 * 权限管理工具类
 * 用于前端权限检查和管理
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private userPermissions: string[] = [];
  private userRoles: string[] = [];
  private isAdmin: boolean = false;
  private isSuperAdmin: boolean = false;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * 初始化权限管理器
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>(async (resolve) => {
      try {
        // 清除现有数据
        this.userPermissions = [];
        this.userRoles = [];
        this.isAdmin = false;
        this.isSuperAdmin = false;

        // 获取当前会话
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          this.initialized = true;
          resolve();
          return;
        }

        // 获取用户角色
        const { data: roles, error: rolesError } = await supabase
          .rpc('get_user_role_names', {
            user_id: sessionData.session.user.id
          });

        if (rolesError) {
          console.error('获取用户角色失败:', rolesError);
        } else if (roles) {
          this.userRoles = roles.map(r => r.role_name);
          this.isAdmin = this.userRoles.includes('system_admin');
          this.isSuperAdmin = this.userRoles.includes('super_admin');
        }

        // 获取用户权限
        const { data: permissions, error: permissionsError } = await supabase
          .from('permissions')
          .select(`
            code,
            role_permissions!inner(
              role_id,
              roles!inner(
                name,
                user_roles!inner(
                  user_id
                )
              )
            )
          `)
          .eq('role_permissions.roles.user_roles.user_id', sessionData.session.user.id);

        if (permissionsError) {
          console.error('获取用户权限失败:', permissionsError);
        } else if (permissions) {
          this.userPermissions = permissions.map(p => p.code);
        }

        this.initialized = true;
        resolve();
      } catch (error) {
        console.error('权限初始化失败:', error);
        this.initialized = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  /**
   * 检查用户是否有指定权限
   * @param permission 权限代码
   * @returns 是否有权限
   */
  public hasPermission(permission: string): boolean {
    if (!this.initialized) {
      console.warn('权限管理器尚未初始化');
      return false;
    }

    // 超级管理员拥有所有权限
    if (this.isSuperAdmin) {
      return true;
    }

    return this.userPermissions.includes(permission);
  }

  /**
   * 检查用户是否有指定角色
   * @param role 角色名称
   * @returns 是否有角色
   */
  public hasRole(role: string): boolean {
    if (!this.initialized) {
      console.warn('权限管理器尚未初始化');
      return false;
    }

    return this.userRoles.includes(role);
  }

  /**
   * 检查用户是否是管理员
   * @returns 是否是管理员
   */
  public isAdminUser(): boolean {
    return this.isAdmin || this.isSuperAdmin;
  }

  /**
   * 检查用户是否是超级管理员
   * @returns 是否是超级管理员
   */
  public isSuperAdminUser(): boolean {
    return this.isSuperAdmin;
  }

  /**
   * 获取用户所有权限
   * @returns 用户权限列表
   */
  public getUserPermissions(): string[] {
    return [...this.userPermissions];
  }

  /**
   * 获取用户所有角色
   * @returns 用户角色列表
   */
  public getUserRoles(): string[] {
    return [...this.userRoles];
  }

  /**
   * 重置权限管理器
   */
  public reset(): void {
    this.userPermissions = [];
    this.userRoles = [];
    this.isAdmin = false;
    this.isSuperAdmin = false;
    this.initialized = false;
    this.initPromise = null;
  }
}

// 创建权限管理器的React Hook
export function usePermissions() {
  const [loading, setLoading] = useState(true);
  const permissionManager = PermissionManager.getInstance();
  
  useEffect(() => {
    const initializePermissions = async () => {
      setLoading(true);
      await permissionManager.init();
      setLoading(false);
    };
    
    initializePermissions();
  }, []);
  
  return {
    loading,
    hasPermission: (permission: string) => permissionManager.hasPermission(permission),
    hasRole: (role: string) => permissionManager.hasRole(role),
    isAdmin: () => permissionManager.isAdminUser(),
    isSuperAdmin: () => permissionManager.isSuperAdminUser(),
    getUserPermissions: () => permissionManager.getUserPermissions(),
    getUserRoles: () => permissionManager.getUserRoles(),
    reset: () => permissionManager.reset()
  };
}

// 创建权限检查高阶组件
interface WithPermissionProps {
  requiredPermission?: string;
  requiredRole?: string;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithPermissionProps
): React.FC<P> {
  return (props: P) => {
    const { loading, hasPermission, hasRole, isAdmin } = usePermissions();
    
    if (loading) {
      return <div className="loading">权限检查中...</div>;
    }
    
    const hasAccess = (
      (!options.requiredPermission || hasPermission(options.requiredPermission)) &&
      (!options.requiredRole || hasRole(options.requiredRole)) &&
      (!options.requireAdmin || isAdmin())
    );
    
    if (hasAccess) {
      return <WrappedComponent {...props} />;
    }
    
    return <>{options.fallback || <div className="no-permission">您没有权限访问此功能</div>}</>;
  };
}

// 创建权限检查组件
interface PermissionGuardProps {
  permission?: string;
  role?: string;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  role,
  requireAdmin,
  fallback,
  children
}) => {
  const { loading, hasPermission, hasRole, isAdmin } = usePermissions();
  
  if (loading) {
    return <div className="loading">权限检查中...</div>;
  }
  
  const hasAccess = (
    (!permission || hasPermission(permission)) &&
    (!role || hasRole(role)) &&
    (!requireAdmin || isAdmin())
  );
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return <>{fallback || <div className="no-permission">您没有权限访问此功能</div>}</>;
}; 