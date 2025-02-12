import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface AddressFormProps {
  address?: {
    id: string;
    recipient_name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    street_address: string;
    postal_code: string;
    is_default: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddressForm({ address, onClose, onSuccess }: AddressFormProps) {
  const [formData, setFormData] = useState({
    recipient_name: address?.recipient_name || '',
    phone: address?.phone || '',
    province: address?.province || '',
    city: address?.city || '',
    district: address?.district || '',
    street_address: address?.street_address || '',
    postal_code: address?.postal_code || '',
    is_default: address?.is_default || false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!formData.recipient_name.trim()) {
      throw new Error('请输入收货人姓名');
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      throw new Error('请输入正确的手机号码');
    }

    if (!formData.province.trim()) {
      throw new Error('请选择省份');
    }

    if (!formData.city.trim()) {
      throw new Error('请选择城市');
    }

    if (!formData.district.trim()) {
      throw new Error('请选择区县');
    }

    if (!formData.street_address.trim()) {
      throw new Error('请输入详细地址');
    }

    const postalRegex = /^\d{6}$/;
    if (!postalRegex.test(formData.postal_code)) {
      throw new Error('请输入正确的邮政编码');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      validateForm();

      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');

      const data = {
        ...formData,
        user_id: user.id
      };

      if (address) {
        const { error } = await supabase
          .from('shipping_addresses')
          .update(data)
          .eq('id', address.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shipping_addresses')
          .insert([data]);

        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving address:', err);
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
            {address ? '编辑地址' : '新增地址'}
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
              收货人姓名
            </label>
            <input
              type="text"
              value={formData.recipient_name}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                省份
              </label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                城市
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                区县
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              详细地址
            </label>
            <input
              type="text"
              value={formData.street_address}
              onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              邮政编码
            </label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
              设为默认地址
            </label>
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