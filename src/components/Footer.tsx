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

  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      if (settings) {
        setSettings({...settings});
      }
    }, 500);
    
    return () => clearTimeout(refreshTimer);
  }, [settings]);

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
        // 强制替换数据库返回的图标为我们的自定义图标
        const customIcons: {[key: string]: string} = {
          'tmall': 'M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm6.35 13.3c-.43 1.84-2.87 3.4-5.12 3.9-2.54.53-5.88-.14-7.43-2.9-.63-1.15-1-2.92-.58-4.13.98-2.71 3.84-1.34 5.5-1.15.42.06 1.2-.35.98-1.27-.17-.8-1.16-1.5-1.98-1.5-1.67-.13-3.46.84-3.23 2.13.1.5.43.95.47 1.4.06.74-.71 1-1.21.48-1.23-1.2-1.55-4.22.27-5.77C7.8 2.13 11.05 2 14.38 3.3c1.67.69 3.58 2.34 3.78 5.26.05 1.28-.27 3.1-1.8 4.74h1.99V6.67h-3.2v1.3H17c.08 1.92-.53 3.82-1.75 5.32h3.1z',
          'jd': 'M20.03 5.07C18.19 2.4 15.49 1.01 12 1.01 5.94 1.01 1.01 5.94 1.01 12c0 6.06 4.93 10.99 10.99 10.99 6.06 0 10.99-4.93 10.99-10.99 0-2.35-.74-4.55-2-6.35l-.96-.58zm-3.06 1.71c.43 0 .77.34.77.77v8.2c0 .43-.34.77-.77.77h-10c-.43 0-.77-.34-.77-.77v-8.2c0-.43.34-.77.77-.77h10zm-8.48 1.5v5.95h1.95V8.28H8.49zm3.3 0v5.95h1.95V8.28h-1.95zm3.3 0v5.95h1.95V8.28h-1.95z',
          'xiaohongshu': 'M17.99 1.47a24.08 24.08 0 00-11.97 0A2.53 2.53 0 004 3.95v16.1a2.53 2.53 0 002.01 2.48c1.96.39 3.96.59 5.99.59 2.02 0 4.03-.2 5.99-.59A2.53 2.53 0 0020 20.05V3.95a2.53 2.53 0 00-2.01-2.48zM10.5 14.7V12h3v2.7a1 1 0 102 0v-5.4a1 1 0 10-2 0V11h-3V9.3a1 1 0 10-2 0v5.4a1 1 0 102 0z',
          'douyin': 'M12.14.02c1.72.21 3.24 1.05 4.28 2.33l.4.52h3.22v6.15c-.46-.05-.92-.08-1.37-.08-2.75 0-5.3 1-7.27 2.69V6.8h-6.1v14.47h6.1v-7.37c1.77-.87 3.73-1.1 5.65-.69v7.07C13.76 21.43 10.09 24 6 24 2.7 24 0 21.3 0 18v-6.6C0 8.19 2.69 5.5 6 5.5c.88 0 1.73.19 2.5.53v6.06a7.99 7.99 0 00-2.5-.4A2.99 2.99 0 003 14.69v.07a2.98 2.98 0 003 2.98c.89 0 1.68-.39 2.23-1.01v1.3l.19.05c-1.15 1.25-2.78 2.02-4.59 2.02h.03V8.02c-.9.68-1.65 1.55-2.18 2.54-.44.84-.69 1.78-.69 2.78v5.33c0 3.23 2.61 5.84 5.84 5.84 2.77 0 5.1-1.92 5.73-4.52v-14A10.04 10.04 0 0112.13.02z',
          'bilibili': 'M17.813 4.653h.854c.87 0 1.583.7 1.583 1.56v1.25c-.2-.1-.43-.16-.67-.16-.34 0-.66.1-.94.26l-1.6-1.5c.2-.2.38-.5.38-.8.0117-.67-.5482-1.2107-1.2248-1.2224H14.31c-.45.0189-.8407.3105-1.0286.7359-.188-.4254-.5788-.7165-1.0286-.7359H10.52c-.6824-.0037-1.2345.5478-1.238 1.2302 0 .31.14.6.37.8l-1.59 1.5c-.28-.15-.59-.25-.93-.25-.24 0-.46.06-.66.15V6.22c0-.87.71-1.56 1.58-1.56h.8519a2.263 2.263 0 0 1-.1519.76c.33.27.75.44 1.20.44h.73c.39 0 .74-.15 1.01-.39.2647.2438.6149.3856.98.39h.74c.45 0 .86-.17 1.18-.44a2.107 2.107 0 0 1-.15-.76zm-4.563 15.2612c.01-.0489.012-.0982.012-.1458V19.1c0-.54-.06-1.08-.17-1.6-.15-.75-.68-1.36-1.44-1.53-.8-.17-2.75-.17-2.76-.17s-1.97 0-2.76.17c-.76.17-1.29.78-1.44 1.53-.11.52-.16 1.06-.17 1.6v.6545c.0024.0539.003.1083.0033.1635.05.55.47.97 1.0315.99H12.22c.54-.0189.96-.44.98-.9855.0039-.0556.0052-.1128.01-.1689zm.61-2.4612c.26.0084.5198.0211.77.0489.78.08 1.19.43 1.36 1.17.09.44.14.9.14 1.34v1.7399c0 .47-.39.85-.87.85H8.82c-.48 0-.87-.38-.87-.85v-1.7399c0-.44.05-.9.14-1.34.16-.74.58-1.08 1.36-1.17.2502-.0278.5099-.0405.77-.0489h3.682zm-2.6108 2.574c.2816.0074.5603.0667.8158.1739.381.1545.6.5147.5991.9184-.16.7682-.8754 1.265-1.6193 1.0528-.63-.1756-.9535-.8655-.7208-1.4861.1207-.3217.4243-.5601.7656-.6227a1.492 1.492 0 0 1 .1596-.0363zm-1.4502.9178c.0048-.2029.1034-.3937.2713-.5251.3-.2243.7206-.1455.9465.1749.2257.3204.1561.7597-.1546.9888-.2777.2072-.667.1641-.8897-.098-.0213-.0261-.0415-.053-.0608-.0806-.2485-.2771-.2104-.7216.0873-.9591z'
        };

        // 遍历数据库返回的社交链接，替换图标
        if (data.social_links && data.social_links.length > 0) {
          data.social_links = data.social_links.map((link: SocialLink) => {
            // 如果有自定义图标，替换它
            if (link.id in customIcons) {
              return {
                ...link,
                icon: customIcons[link.id]
              };
            }
            return link;
          });
        }
        
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
              icon: 'M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm6.35 13.3c-.43 1.84-2.87 3.4-5.12 3.9-2.54.53-5.88-.14-7.43-2.9-.63-1.15-1-2.92-.58-4.13.98-2.71 3.84-1.34 5.5-1.15.42.06 1.2-.35.98-1.27-.17-.8-1.16-1.5-1.98-1.5-1.67-.13-3.46.84-3.23 2.13.1.5.43.95.47 1.4.06.74-.71 1-1.21.48-1.23-1.2-1.55-4.22.27-5.77C7.8 2.13 11.05 2 14.38 3.3c1.67.69 3.58 2.34 3.78 5.26.05 1.28-.27 3.1-1.8 4.74h1.99V6.67h-3.2v1.3H17c.08 1.92-.53 3.82-1.75 5.32h3.1z'
            },
            {
              id: 'jd',
              platform: '京东商城',
              url: '#',
              icon: 'M20.03 5.07C18.19 2.4 15.49 1.01 12 1.01 5.94 1.01 1.01 5.94 1.01 12c0 6.06 4.93 10.99 10.99 10.99 6.06 0 10.99-4.93 10.99-10.99 0-2.35-.74-4.55-2-6.35l-.96-.58zm-3.06 1.71c.43 0 .77.34.77.77v8.2c0 .43-.34.77-.77.77h-10c-.43 0-.77-.34-.77-.77v-8.2c0-.43.34-.77.77-.77h10zm-8.48 1.5v5.95h1.95V8.28H8.49zm3.3 0v5.95h1.95V8.28h-1.95zm3.3 0v5.95h1.95V8.28h-1.95z'
            },
            {
              id: 'xiaohongshu',
              platform: '小红书',
              url: '#',
              icon: 'M17.99 1.47a24.08 24.08 0 00-11.97 0A2.53 2.53 0 004 3.95v16.1a2.53 2.53 0 002.01 2.48c1.96.39 3.96.59 5.99.59 2.02 0 4.03-.2 5.99-.59A2.53 2.53 0 0020 20.05V3.95a2.53 2.53 0 00-2.01-2.48zM10.5 14.7V12h3v2.7a1 1 0 102 0v-5.4a1 1 0 10-2 0V11h-3V9.3a1 1 0 10-2 0v5.4a1 1 0 102 0z'
            },
            {
              id: 'douyin',
              platform: '抖音',
              url: '#',
              icon: 'M12.14.02c1.72.21 3.24 1.05 4.28 2.33l.4.52h3.22v6.15c-.46-.05-.92-.08-1.37-.08-2.75 0-5.3 1-7.27 2.69V6.8h-6.1v14.47h6.1v-7.37c1.77-.87 3.73-1.1 5.65-.69v7.07C13.76 21.43 10.09 24 6 24 2.7 24 0 21.3 0 18v-6.6C0 8.19 2.69 5.5 6 5.5c.88 0 1.73.19 2.5.53v6.06a7.99 7.99 0 00-2.5-.4A2.99 2.99 0 003 14.69v.07a2.98 2.98 0 003 2.98c.89 0 1.68-.39 2.23-1.01v1.3l.19.05c-1.15 1.25-2.78 2.02-4.59 2.02h.03V8.02c-.9.68-1.65 1.55-2.18 2.54-.44.84-.69 1.78-.69 2.78v5.33c0 3.23 2.61 5.84 5.84 5.84 2.77 0 5.1-1.92 5.73-4.52v-14A10.04 10.04 0 0112.13.02z'
            },
            {
              id: 'bilibili',
              platform: 'bilibili',
              url: '#',
              icon: 'M17.813 4.653h.854c.87 0 1.583.7 1.583 1.56v1.25c-.2-.1-.43-.16-.67-.16-.34 0-.66.1-.94.26l-1.6-1.5c.2-.2.38-.5.38-.8.0117-.67-.5482-1.2107-1.2248-1.2224H14.31c-.45.0189-.8407.3105-1.0286.7359-.188-.4254-.5788-.7165-1.0286-.7359H10.52c-.6824-.0037-1.2345.5478-1.238 1.2302 0 .31.14.6.37.8l-1.59 1.5c-.28-.15-.59-.25-.93-.25-.24 0-.46.06-.66.15V6.22c0-.87.71-1.56 1.58-1.56h.8519a2.263 2.263 0 0 1-.1519.76c.33.27.75.44 1.20.44h.73c.39 0 .74-.15 1.01-.39.2647.2438.6149.3856.98.39h.74c.45 0 .86-.17 1.18-.44a2.107 2.107 0 0 1-.15-.76zm-4.563 15.2612c.01-.0489.012-.0982.012-.1458V19.1c0-.54-.06-1.08-.17-1.6-.15-.75-.68-1.36-1.44-1.53-.8-.17-2.75-.17-2.76-.17s-1.97 0-2.76.17c-.76.17-1.29.78-1.44 1.53-.11.52-.16 1.06-.17 1.6v.6545c.0024.0539.003.1083.0033.1635.05.55.47.97 1.0315.99H12.22c.54-.0189.96-.44.98-.9855.0039-.0556.0052-.1128.01-.1689zm.61-2.4612c.26.0084.5198.0211.77.0489.78.08 1.19.43 1.36 1.17.09.44.14.9.14 1.34v1.7399c0 .47-.39.85-.87.85H8.82c-.48 0-.87-.38-.87-.85v-1.7399c0-.44.05-.9.14-1.34.16-.74.58-1.08 1.36-1.17.2502-.0278.5099-.0405.77-.0489h3.682zm-2.6108 2.574c.2816.0074.5603.0667.8158.1739.381.1545.6.5147.5991.9184-.16.7682-.8754 1.265-1.6193 1.0528-.63-.1756-.9535-.8655-.7208-1.4861.1207-.3217.4243-.5601.7656-.6227a1.492 1.492 0 0 1 .1596-.0363zm-1.4502.9178c.0048-.2029.1034-.3937.2713-.5251.3-.2243.7206-.1455.9465.1749.2257.3204.1561.7597-.1546.9888-.2777.2072-.667.1641-.8897-.098-.0213-.0261-.0415-.053-.0608-.0806-.2485-.2771-.2104-.7216.0873-.9591z'
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
            {(settings?.social_links || []).map((link) => {
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                  title={link.platform}
                >
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-800 group-hover:bg-indigo-600 transition-colors duration-300">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-8 h-8 fill-current text-gray-300 group-hover:text-white transition-colors duration-300"
                      data-icon-id={link.id}
                      style={{border: '1px solid transparent'}}
                    >
                      <path d={link.icon} />
                    </svg>
                  </div>
                  <span className="block text-center text-sm mt-2 text-gray-400 group-hover:text-indigo-400 transition-colors duration-300">
                    {link.platform}
                  </span>
                </a>
              );
            })}
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