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

const OptimizedImage = ({ src, alt, className }: { src: string; alt: string; className: string }) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      loading="lazy"
      decoding="async"
      width="1920"
      height="1080"
    />
  );
};

export default function Hero() {
  const [banner, setBanner] = useState<Banner>({
    id: 'default',
    image_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=2068',
    title: '定制您的专属隐形眼镜',
    subtitle: '采用先进的数字扫描技术，为您量身定制完美贴合的隐形眼镜，提供无与伦比的舒适体验',
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
        <OptimizedImage
          src={banner.image_url}
          alt="专业隐形眼镜定制服务"
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