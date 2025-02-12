import React, { useEffect, useState } from 'react';
import { supabase, handleSupabaseError, retryOperation } from '../lib/supabase';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
}

interface FooterSettings {
  social_links: SocialLink[];
  company_name: string;
  icp_number: string;
  icp_link: string;
  business_license: string;
  business_license_link: string;
}

export default function Footer() {
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
      }
      setError(null);

      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('site_settings')
          .select('social_links, company_name, icp_number, icp_link, business_license, business_license_link')
          .single();
      }, 3, 1000);

      if (error) throw error;

      if (data) {
        setSettings(data);
        setRetryCount(0); // Reset retry count on success
      } else {
        // Use default settings if no data is available
        setSettings({
          company_name: '希乔尔医疗科技有限公司',
          icp_number: '浙ICP备XXXXXXXX号',
          icp_link: 'https://beian.miit.gov.cn/',
          business_license: '医疗器械经营许可证 浙XXX号',
          business_license_link: '#',
          social_links: [
            {
              id: 'tmall',
              platform: '天猫商城',
              url: '#',
              icon: 'M13.9 2.1L8 3.8l-5.9-1.7C.9 1.8 0 2.5 0 3.8v16.4c0 1.3.9 2 2.1 1.7L8 20.2l5.9 1.7c1.2.3 2.1-.4 2.1-1.7V3.8c0-1.3-.9-2-2.1-1.7zM7 16.2l-3-3 1.4-1.4L7 13.4l4.6-4.6L13 10.2l-6 6z'
            },
            {
              id: 'jd',
              platform: '京东商城',
              url: '#',
              icon: 'M7 0C3.1 0 0 3.1 0 7v10c0 3.9 3.1 7 7 7h10c3.9 0 7-3.1 7-7V7c0-3.9-3.1-7-7-7H7zm4.7 5.7c.4 0 .8.1 1.1.4.3.3.5.6.5 1v6.8c0 .4-.2.7-.5 1-.3.3-.7.4-1.1.4H8.3c-.4 0-.8-.1-1.1-.4-.3-.3-.5-.6-.5-1V7.1c0-.4.2-.7.5-1 .3-.3.7-.4 1.1-.4h3.4z'
            },
            {
              id: 'xiaohongshu',
              platform: '小红书',
              url: '#',
              icon: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 14.2c-.4.7-1.1 1.3-1.9 1.6-.8.3-1.6.5-2.5.5-1.1 0-2.2-.2-3.2-.7-1-.5-1.9-1.1-2.6-2-.7-.8-1.2-1.8-1.6-2.9-.4-1.1-.5-2.3-.5-3.5 0-1.2.2-2.4.5-3.5.4-1.1.9-2.1 1.6-2.9.7-.8 1.6-1.5 2.6-2 1-.5 2.1-.7 3.2-.7.9 0 1.7.2 2.5.5.8.3 1.5.9 1.9 1.6.1.2.1.4 0 .6-.1.2-.3.3-.5.3h-1.5c-.2 0-.4-.1-.5-.2-.3-.4-.7-.7-1.2-.9-.5-.2-1-.3-1.6-.3-.8 0-1.5.2-2.2.5-.7.3-1.2.8-1.7 1.4-.5.6-.8 1.3-1.1 2.1-.2.8-.4 1.6-.4 2.5s.1 1.7.4 2.5c.2.8.6 1.5 1.1 2.1.5.6 1 1.1 1.7 1.4.7.3 1.4.5 2.2.5.6 0 1.1-.1 1.6-.3.5-.2.9-.5 1.2-.9.1-.1.3-.2.5-.2h1.5c.2 0 .4.1.5.3.1.2.1.4 0 .6z'
            },
            {
              id: 'douyin',
              platform: '抖音',
              url: '#',
              icon: 'M16.6.1h-3.3c-.2 2.5-1.7 4.8-3.9 5.9-1.1.5-2.3.8-3.5.8h-.3v3.4h.3c1.2 0 2.4.2 3.5.8 2.2 1.1 3.7 3.4 3.9 5.9h3.3c-.2-2.8-1.7-5.3-3.9-6.9 2.3-1.5 3.7-4.1 3.9-6.9zm-6.7 7.9c-1.3-.7-2.7-1-4.2-1h-.3V3.6h.3c1.5 0 2.9-.3 4.2-1 2.1-1.1 3.6-3.2 3.9-5.6h3.3c-.2 2.8-1.7 5.3-3.9 6.9 2.2 1.6 3.7 4.1 3.9 6.9h-3.3c-.3-2.3-1.8-4.4-3.9-5.6z'
            },
            {
              id: 'bilibili',
              platform: 'bilibili',
              url: '#',
              icon: 'M17.8 4.1c.2-.2.3-.4.3-.7 0-.3-.1-.5-.3-.7l-2.6-2.6c-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3L12 2 10.2.1c-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3L6.2 2.7c-.2.2-.3.4-.3.7 0 .3.1.5.3.7l1.8 1.8C5.6 7.1 4 9.2 4 11.7v4.7c0 2.8 2.2 5 5 5h6c2.8 0 5-2.2 5-5v-4.7c0-2.5-1.6-4.6-3.9-5.4l1.7-1.7zM7 13c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm5 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm5 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z'
            }
          ]
        });
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'footer settings');
      console.error('Error in footer settings:', handledError);
      setError(handledError.message);
      
      // Implement exponential backoff for retries
      if (retryCount < 3) {
        setRetrying(true);
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          setRetrying(false);
          fetchSettings(true);
        }, delay);
      }
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          {error && (
            <div className="mb-8 text-red-400 text-sm flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
              {retrying && (
                <span className="ml-2 text-gray-400">
                  正在重试 ({retryCount}/3)...
                </span>
              )}
            </div>
          )}
          
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold mb-2">关注我们</h3>
            <p className="text-gray-400">在社交媒体上关注希乔尔，获取最新资讯</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {(settings?.social_links || []).map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                title={link.platform}
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 group-hover:bg-indigo-600 transition-colors duration-300">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 fill-current text-gray-400 group-hover:text-white transition-colors duration-300"
                  >
                    <path d={link.icon} />
                  </svg>
                </div>
                <span className="block text-center text-sm mt-2 text-gray-400 group-hover:text-indigo-400 transition-colors duration-300">
                  {link.platform}
                </span>
              </a>
            ))}
          </div>

          {/* Legal Information Section */}
          <div className="w-full max-w-3xl border-t border-gray-800 pt-8">
            <div className="text-center space-y-4">
              <p className="text-gray-400">
                Copyright © {new Date().getFullYear()} {settings?.company_name}. 保留所有权利.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <a
                  href={settings?.icp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300 transition-colors"
                >
                  {settings?.icp_number}
                </a>
                <span className="hidden sm:inline text-gray-700">|</span>
                <a
                  href={settings?.business_license_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300 transition-colors"
                >
                  {settings?.business_license}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}