import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import BannerForm from './BannerForm';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  is_active: boolean;
  order: number;
}

export default function BannerList() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('order');

      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      console.error('Error fetching banners:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个轮播图吗？')) return;

    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBanners();
    } catch (err: any) {
      console.error('Error deleting banner:', err);
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
        <h2 className="text-2xl font-bold text-gray-900">轮播图管理</h2>
        <button
          onClick={() => {
            setSelectedBanner(null);
            setShowForm(true);
          }}
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          添加轮播图
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center p-4">
              <div className="w-48 h-32 rounded-lg overflow-hidden">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="ml-6 flex-1">
                <h3 className="text-lg font-medium text-gray-900">{banner.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{banner.subtitle}</p>
                <div className="mt-2 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {banner.is_active ? '已启用' : '已禁用'}
                  </span>
                  <span className="ml-4 text-sm text-gray-500">
                    排序: {banner.order}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setSelectedBanner(banner);
                    setShowForm(true);
                  }}
                  className="text-indigo-600 hover:text-indigo-900"
                  title="编辑"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="text-red-600 hover:text-red-900"
                  title="删除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <BannerForm
          banner={selectedBanner}
          onClose={() => {
            setShowForm(false);
            setSelectedBanner(null);
          }}
          onSuccess={() => {
            fetchBanners();
            setShowForm(false);
            setSelectedBanner(null);
          }}
        />
      )}
    </div>
  );
}