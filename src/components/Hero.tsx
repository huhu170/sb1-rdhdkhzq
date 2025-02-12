import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  is_active: boolean;
  order: number;
}

export default function Hero() {
  const [banner, setBanner] = useState<Banner>({
    id: 'default',
    image_url: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&q=80',
    title: '定制专属你的美瞳体验',
    subtitle: '探索希乔尔精品彩色隐形眼镜系列，为您打造舒适自然的独特魅力',
    is_active: true,
    order: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveBanner();
  }, []);

  const fetchActiveBanner = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setBanner(data[0]);
      }
    } catch (error) {
      console.error('Error fetching banner:', error);
    }
  };

  return (
    <div className="relative h-screen">
      <div className="absolute inset-0">
        <img
          src={banner.image_url}
          alt="美丽的彩色隐形眼镜效果"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            {banner.title}
          </h1>
          <p className="text-xl text-gray-200 mb-8">
            {banner.subtitle}
          </p>
          <button 
            onClick={() => navigate('/products')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-indigo-700 transition"
          >
            浏览系列产品
          </button>
        </div>
      </div>
    </div>
  );
}