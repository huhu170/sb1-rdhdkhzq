import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

// 中国省份数据
const CHINA_PROVINCES = [
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省', 
  '黑龙江省', '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', 
  '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', 
  '海南省', '重庆市', '四川省', '贵州省', '云南省', '西藏自治区', '陕西省', 
  '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区', '台湾省', 
  '香港特别行政区', '澳门特别行政区'
];

// 简化的城市数据结构，实际项目中可能需要更完整的数据
const CITY_MAP: {[key: string]: string[]} = {
  '北京市': ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '顺义区', '通州区', '大兴区', '房山区', '门头沟区', '昌平区', '平谷区', '密云区', '延庆区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区', '嘉定区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'],
  '广东省': ['广州市', '深圳市', '珠海市', '汕头市', '佛山市', '韶关市', '湛江市', '肇庆市', '江门市', '茂名市', '惠州市', '梅州市', '汕尾市', '河源市', '阳江市', '清远市', '东莞市', '中山市', '潮州市', '揭阳市', '云浮市'],
  // ... 其他省份的城市数据
};

// 为所有省份提供至少一个默认值
Object.keys(CHINA_PROVINCES).forEach(province => {
  if (!CITY_MAP[province]) {
    CITY_MAP[province] = ['市辖区'];
  }
});

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
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>(['请先选择城市']);

  // 当省份变化时更新城市列表
  useEffect(() => {
    if (formData.province) {
      setCities(CITY_MAP[formData.province] || []);
      if (!CITY_MAP[formData.province]?.includes(formData.city)) {
        setFormData(prev => ({...prev, city: '', district: ''}));
      }
    } else {
      setCities([]);
      setFormData(prev => ({...prev, city: '', district: ''}));
    }
  }, [formData.province]);

  // 当城市变化时重置区县
  useEffect(() => {
    if (formData.city) {
      // 这里使用简单的区县数据，实际项目中可能需要更完整的数据
      setDistricts(['城区', '郊区', '新区', '开发区']);
    } else {
      setDistricts(['请先选择城市']);
    }
  }, [formData.city]);

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

    // 邮政编码验证改为可选项
    if (formData.postal_code && formData.postal_code.trim() !== '') {
      const postalRegex = /^\d{6}$/;
      if (!postalRegex.test(formData.postal_code)) {
        throw new Error('如需填写邮政编码，请输入正确的6位数字');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      validateForm();

      const { data: { user } } = await supabase.auth.getUser();
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
              <select
                value={formData.province}
                onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">请选择省份</option>
                {CHINA_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                城市
              </label>
              <select
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={!formData.province}
              >
                <option value="">请选择城市</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                区县
              </label>
              <select
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={!formData.city}
              >
                <option value="">请选择区县</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
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
              邮政编码（选填）
            </label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="选填，如填写需要6位数字"
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