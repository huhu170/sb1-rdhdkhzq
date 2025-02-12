import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { X } from 'lucide-react';

interface UserFormProps {
  user?: {
    id: string;
    email: string;
    profile: {
      display_name: string;
      phone: string;
      status: string;
    };
    roles: string[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    display_name: user?.profile?.display_name || '',
    phone: user?.profile?.phone || '',
    status: user?.profile?.status || 'active',
    roles: user?.roles || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            status: formData.status
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
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
            status: formData.status
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
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
          <div className="mb-4 bg-red-50 text-red-500 p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <input
              type="email"
              required
              disabled={!!user}
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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

          <div className="flex justify-end space-x-3 pt-4">
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