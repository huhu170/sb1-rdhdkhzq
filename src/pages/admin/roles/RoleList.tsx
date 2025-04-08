import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Search, Edit, Trash2, Shield, Save, X } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  _count?: {
    role_permissions: number;
    user_roles: number;
  };
}

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
}

export default function RoleList() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取角色基本信息
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (rolesError) throw rolesError;
      
      // 获取角色对应的权限数量和用户数量
      if (rolesData && rolesData.length > 0) {
        const rolesWithCounts = await Promise.all(
          rolesData.map(async (role) => {
            // 获取角色关联的权限数量
            const { count: permissionsCount, error: permCountErr } = await supabase
              .from('role_permissions')
              .select('*', { count: 'exact', head: true })
              .eq('role_id', role.id);
            
            if (permCountErr) throw permCountErr;
            
            // 获取使用该角色的用户数量
            const { count: usersCount, error: userCountErr } = await supabase
              .from('user_roles')
              .select('*', { count: 'exact', head: true })
              .eq('role_id', role.id);
            
            if (userCountErr) throw userCountErr;
            
            return {
              ...role,
              _count: {
                role_permissions: permissionsCount || 0,
                user_roles: usersCount || 0
              }
            };
          })
        );
        
        setRoles(rolesWithCounts);
      } else {
        setRoles([]);
      }
      
      // 获取权限
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('name', { ascending: true });

      if (permissionsError) throw permissionsError;
      
      setPermissions(permissionsData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openRoleForm = (role?: Role) => {
    setSelectedRole(role || null);
    setShowRoleForm(true);
  };

  const closeRoleForm = () => {
    setSelectedRole(null);
    setShowRoleForm(false);
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    // 防止删除基本角色
    if (roleName === 'admin' || roleName === 'customer') {
      setError(`不能删除系统基本角色: ${roleName}`);
      return;
    }

    if (!window.confirm(`确定要删除角色 "${roleName}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">角色与权限管理</h2>
        <button
          onClick={() => openRoleForm()}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加角色
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
          <button 
            className="ml-2 text-sm underline"
            onClick={() => setError(null)}
          >
            关闭
          </button>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">系统角色</h3>
          <p className="mt-1 text-sm text-gray-500">
            管理系统中的角色及其对应的权限，为用户分配合适的角色
          </p>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                描述
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                关联数据
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Shield className={`w-5 h-5 mr-2 ${
                      role.name === 'admin' ? 'text-indigo-600' : 
                      role.name === 'customer' ? 'text-green-500' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium text-gray-900">
                      {role.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">
                    {role.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">
                    <div>权限: {role._count?.role_permissions || 0}</div>
                    <div>用户: {role._count?.user_roles || 0}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                  <button
                    onClick={() => openRoleForm(role)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                    title="编辑角色"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id, role.name)}
                    className={`text-red-600 hover:text-red-900 ${
                      role.name === 'admin' || role.name === 'customer' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={role.name === 'admin' || role.name === 'customer' ? '系统角色不可删除' : '删除角色'}
                    disabled={role.name === 'admin' || role.name === 'customer'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRoleForm && (
        <RoleForm
          role={selectedRole}
          permissions={permissions}
          onClose={closeRoleForm}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

interface RoleFormProps {
  role?: Role | null;
  permissions: Permission[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RoleForm({ role, permissions, onClose, onSuccess }: RoleFormProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissionIds: [] as string[]
  });
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取角色的权限
  useEffect(() => {
    if (role) {
      fetchRolePermissions(role.id);
    }
  }, [role]);

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);

      if (error) throw error;
      
      const permissionIds = data?.map(item => item.permission_id) || [];
      setRolePermissions(permissionIds);
      setFormData(prev => ({ ...prev, permissionIds }));
    } catch (err: any) {
      console.error('Error fetching role permissions:', err);
      setError('获取角色权限失败: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('角色名称不能为空');
      setLoading(false);
      return;
    }

    try {
      if (role) {
        // 系统基本角色只能修改描述，不能修改名称
        const isSystemRole = role.name === 'admin' || role.name === 'customer';
        
        // 更新角色
        const { error: updateError } = await supabase
          .from('roles')
          .update({
            name: isSystemRole ? role.name : formData.name, // 系统角色不能修改名称
            description: formData.description
          })
          .eq('id', role.id);

        if (updateError) throw updateError;

        // 更新角色权限
        // 先删除现有权限
        const { error: deletePermError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', role.id);

        if (deletePermError) throw deletePermError;

        // 添加新权限
        if (formData.permissionIds.length > 0) {
          const { error: insertPermError } = await supabase
            .from('role_permissions')
            .insert(
              formData.permissionIds.map(permId => ({
                role_id: role.id,
                permission_id: permId
              }))
            );

          if (insertPermError) throw insertPermError;
        }
      } else {
        // 检查角色名是否已存在
        const { data: existingRoles, error: checkError } = await supabase
          .from('roles')
          .select('name')
          .eq('name', formData.name)
          .limit(1);

        if (checkError) throw checkError;
        
        if (existingRoles && existingRoles.length > 0) {
          throw new Error('角色名称已存在');
        }

        // 创建新角色
        const { data: roleData, error: insertError } = await supabase
          .from('roles')
          .insert({
            name: formData.name,
            description: formData.description
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // 添加权限
        if (formData.permissionIds.length > 0 && roleData) {
          const { error: permError } = await supabase
            .from('role_permissions')
            .insert(
              formData.permissionIds.map(permId => ({
                role_id: roleData.id,
                permission_id: permId
              }))
            );

          if (permError) throw permError;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving role:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permId: string) => {
    setFormData(prev => {
      if (prev.permissionIds.includes(permId)) {
        return { ...prev, permissionIds: prev.permissionIds.filter(id => id !== permId) };
      } else {
        return { ...prev, permissionIds: [...prev.permissionIds, permId] };
      }
    });
  };

  // 按模块分组权限
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const isSystemRole = role && (role.name === 'admin' || role.name === 'customer');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {role ? '编辑角色' : '添加角色'}
            {isSystemRole && <span className="ml-2 text-sm text-indigo-600">(系统基本角色)</span>}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              角色名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSystemRole}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="输入角色名称"
            />
            {isSystemRole && <p className="mt-1 text-xs text-gray-500">系统角色名称不可修改</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              角色描述
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              placeholder="输入角色描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              权限设置
            </label>
            <div className="border rounded-md divide-y">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                    {module} 模块
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {perms.map(perm => (
                      <div key={perm.id} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id={`perm-${perm.id}`}
                          checked={formData.permissionIds.includes(perm.id)}
                          onChange={() => handlePermissionToggle(perm.id)}
                          className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div>
                          <label htmlFor={`perm-${perm.id}`} className="block text-sm font-medium text-gray-700">
                            {perm.name}
                          </label>
                          {perm.description && (
                            <p className="text-xs text-gray-500">{perm.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(permissionsByModule).length === 0 && (
              <p className="text-sm text-gray-500 mt-2">无可用权限</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
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