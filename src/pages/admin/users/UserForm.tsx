import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, AlertCircle } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface UserFormProps {
  user?: {
    id: string;
    email: string;
    profile?: {
      display_name: string;
      phone: string;
      status: string;
      account_type: string;
    };
    roles: string[];
  } | null;
  onClose: () => void;
  onSuccess: () => void;
  defaultAccountType?: 'customer' | 'admin';
}

export default function UserForm({ user, onClose, onSuccess, defaultAccountType = 'customer' }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    display_name: user?.profile?.display_name || '',
    phone: user?.profile?.phone || '',
    status: user?.profile?.status || 'active',
    account_type: user?.profile?.account_type || defaultAccountType,
    roles: user?.roles || []
  });
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .order('name');

      if (error) throw error;
      setAvailableRoles(data || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setError('角色加载失败: ' + err.message);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (user) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            display_name: formData.display_name,
            phone: formData.phone,
            status: formData.status,
            account_type: formData.account_type
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // 更新用户角色
        // 先删除现有角色
        const { error: deleteRolesError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id);

        if (deleteRolesError) throw deleteRolesError;

        // 再添加选择的角色
        if (formData.roles.length > 0) {
          const { error: insertRolesError } = await supabase
            .from('user_roles')
            .insert(
              formData.roles.map(roleId => ({
                user_id: user.id,
                role_id: roleId
              }))
            );

          if (insertRolesError) throw insertRolesError;
        }
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true
        });

        if (authError) throw authError;

        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            display_name: formData.display_name,
            phone: formData.phone,
            status: formData.status,
            account_type: formData.account_type
          });

        if (profileError) throw profileError;

        // Assign roles
        if (formData.roles.length > 0) {
          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(
              formData.roles.map(roleId => ({
                user_id: authData.user.id,
                role_id: roleId
              }))
            );

          if (rolesError) throw rolesError;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => {
      if (prev.roles.includes(roleId)) {
        return { ...prev, roles: prev.roles.filter(id => id !== roleId) };
      } else {
        return { ...prev, roles: [...prev.roles, roleId] };
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {user ? '编辑账号' : '添加账号'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">基本信息</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                disabled={!!user}
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              {user && (
                <p className="mt-1 text-xs text-gray-500">邮箱不可更改</p>
              )}
            </div>

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="至少6个字符"
                  minLength={6}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                显示名称
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="用户展示名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                手机号码
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="选填"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
                <option value="suspended">已停用</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                账号类型
              </label>
              <select
                value={formData.account_type}
                onChange={(e) =>
                  setFormData({ ...formData, account_type: e.target.value })
                }
                className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="customer">前台用户</option>
                <option value="admin">后台管理员</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                前台用户只能访问前台功能，后台管理员可以访问管理后台
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">角色设置</h4>
            {loadingRoles ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-500">加载角色中...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableRoles.length > 0 ? (
                  availableRoles.map(role => (
                    <div key={role.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id={`role-${role.id}`}
                        checked={formData.roles.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <label htmlFor={`role-${role.id}`} className="block text-sm font-medium text-gray-700">
                          {role.name}
                        </label>
                        {role.description && (
                          <p className="text-xs text-gray-500">{role.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">没有找到可用的角色</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || loadingRoles}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}