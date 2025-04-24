import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { Save, Plus, Trash2, GripVertical, Upload } from 'lucide-react';
import { message } from 'antd';
import { debounce } from 'lodash';

interface SupabaseError {
  message: string;
  code?: string;
}

interface SiteSettings {
  id: string;
  logo_url: string | null;
  site_title: string;
  site_description: string;
  site_keywords: string;
  site_author: string;
  company_name: string;
  icp_number: string;
  icp_link: string;
  business_license: string;
  business_license_link: string;
  nav_font_family: string;
  nav_font_size: string;
  nav_items: Array<{
    id: string;
    label: string;
    href: string;
    subItems?: Array<{
      id: string;
      label: string;
      href: string;
    }>;
  }>;
  social_links: Array<{
    id: string;
    platform: string;
    url: string;
    icon: string;
    icon_url?: string;
  }>;
  payment_config: {
    alipay: {
      enabled: boolean;
      app_id: string;
      private_key: string;
      public_key: string;
      sandbox_mode: boolean;
    };
    wechat: {
      enabled: boolean;
      app_id: string;
      mch_id: string;
      api_key: string;
      app_secret: string;
      sandbox_mode: boolean;
    };
  };
}

export default function SiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  const debouncedSetFormData = useMemo(
    () => debounce((value: Partial<SiteSettings>) => {
      setSettings(prev => prev ? { ...prev, ...value } : null);
    }, 100),
    []
  );

  // 在组件卸载时清理debounce
  useEffect(() => {
    return () => {
      debouncedSetFormData.cancel();
    };
  }, [debouncedSetFormData]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('正在获取设置...');
      
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error) {
        console.error('获取设置失败:', error);
        throw error;
      }
      
      console.log('获取到的设置:', data);
      
      // 确保payment_config字段存在且结构完整
      if (!data.payment_config) {
        data.payment_config = {
          alipay: {
            enabled: false,
            app_id: '',
            private_key: '',
            public_key: '',
            sandbox_mode: false
          },
          wechat: {
            enabled: false,
            app_id: '',
            mch_id: '',
            api_key: '',
            app_secret: '',
            sandbox_mode: false
          }
        };
      } else {
        // 确保alipay配置存在
        if (!data.payment_config.alipay) {
          data.payment_config.alipay = {
            enabled: false,
            app_id: '',
            private_key: '',
            public_key: '',
            sandbox_mode: false
          };
        }
        // 确保wechat配置存在
        if (!data.payment_config.wechat) {
          data.payment_config.wechat = {
            enabled: false,
            app_id: '',
            mch_id: '',
            api_key: '',
            app_secret: '',
            sandbox_mode: false
          };
        }
      }
      
      setSettings(data);
    } catch (err: any) {
      console.error('获取设置时出错:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!settings?.site_title.trim()) errors.push('标题不能为空');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(err => message.error(err));
      return;
    }
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      // 确保payment_config字段存在且结构完整
      if (!settings.payment_config) {
        settings.payment_config = {
          alipay: {
            enabled: false,
            app_id: '',
            private_key: '',
            public_key: '',
            sandbox_mode: false
          },
          wechat: {
            enabled: false,
            app_id: '',
            mch_id: '',
            api_key: '',
            app_secret: '',
            sandbox_mode: false
          }
        };
      }

      console.log('正在保存设置 - 数据详情:', JSON.stringify(settings, null, 2));

      // 检查settings对象中是否有缺失字段
      for (const key of ['logo_url', 'site_title', 'company_name', 'nav_items', 'social_links', 'payment_config']) {
        if (settings[key as keyof SiteSettings] === undefined) {
          console.warn(`警告: 字段 ${key} 缺失`);
        }
      }

      // 首先检查表是否存在
      const { count, error: checkError } = await supabase
        .from('site_settings')
        .select('*', { count: 'exact', head: true })
        .eq('id', 'default');
      
      if (checkError) {
        console.error('检查表失败:', checkError);
        throw new Error(`检查表失败: ${checkError.message}`);
      }

      console.log('检查表结果:', count);

      let updateResult;
      
      if (count && count > 0) {
        // 表存在，执行更新
        console.log('执行更新操作');
        updateResult = await supabase
          .from('site_settings')
          .update({
            logo_url: settings.logo_url,
            site_title: settings.site_title,
            site_description: settings.site_description,
            site_keywords: settings.site_keywords,
            site_author: settings.site_author,
            company_name: settings.company_name,
            icp_number: settings.icp_number,
            icp_link: settings.icp_link,
            business_license: settings.business_license,
            business_license_link: settings.business_license_link,
            nav_font_family: settings.nav_font_family,
            nav_font_size: settings.nav_font_size,
            nav_items: settings.nav_items,
            social_links: settings.social_links,
            payment_config: settings.payment_config,
            updated_at: new Date().toISOString()
          })
          .eq('id', 'default');
      } else {
        // 表不存在或记录不存在，执行插入
        console.log('执行插入操作');
        updateResult = await supabase
          .from('site_settings')
          .insert({
            id: 'default',
            logo_url: settings.logo_url,
            site_title: settings.site_title,
            site_description: settings.site_description,
            site_keywords: settings.site_keywords,
            site_author: settings.site_author,
            company_name: settings.company_name,
            icp_number: settings.icp_number,
            icp_link: settings.icp_link,
            business_license: settings.business_license,
            business_license_link: settings.business_license_link,
            nav_font_family: settings.nav_font_family,
            nav_font_size: settings.nav_font_size,
            nav_items: settings.nav_items,
            social_links: settings.social_links,
            payment_config: settings.payment_config,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      const { error } = updateResult;

      if (error) {
        console.error('保存设置失败 - 完整错误信息:', error);
        
        // 分析错误类型并提供更具体的错误消息
        let errorMessage = `保存失败: ${error.message}`;
        
        if (error.code === '23505') {
          errorMessage = '保存失败: 记录已存在';
        } else if (error.code === '23502') {
          errorMessage = '保存失败: 必填字段不能为空';
        } else if (error.code === '42P01') {
          errorMessage = '保存失败: 表不存在，请联系管理员';
        } else if (error.code === '22P02') {
          errorMessage = '保存失败: 数据格式错误';
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('设置保存成功');
      // 重新获取最新设置
      await fetchSettings();
      
      // 显示成功提示
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50';
      successMessage.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm">设置已保存</p>
          </div>
        </div>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);

    } catch (err: any) {
      console.error('保存设置时出错:', err);
      // 提供更具体的错误信息
      let errorMessage = err.message || '保存失败，请重试';
      
      // 检查是否是网络错误
      if (!navigator.onLine) {
        errorMessage = '网络连接已断开，请检查您的网络连接后重试';
      }
      
      // 检查是否是权限错误
      if (err.code === 'PGRST301' || err.code === '42501') {
        errorMessage = '权限不足，请确认您有权限修改设置';
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (file: File, linkId: string) => {
    try {
      setIsUploading(true);
      setError(null);
      console.log(`开始上传图标，linkId: ${linkId}, 文件名: ${file.name}, 类型: ${file.type}, 大小: ${file.size}字节`);

      if (file.size > 1 * 1024 * 1024) {
        throw new Error('图标文件大小不能超过1MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${linkId}.${fileExt}`;
      const filePath = `icons/${fileName}`;

      console.log(`准备上传文件到路径: ${filePath}`);

      // 检查images存储桶是否存在
      const { data: buckets, error: bucketsError } = await supabase.storage
        .listBuckets();
      
      console.log('存储桶列表:', buckets);
      
      if (bucketsError) {
        console.error('获取存储桶列表失败:', bucketsError);
        throw new Error(`获取存储桶列表失败: ${bucketsError.message}`);
      }
      
      const bucketExists = buckets?.some(b => b.name === 'images');
      console.log('images存储桶是否存在:', bucketExists);

      // 创建images存储桶（如果不存在）
      if (!bucketExists) {
        console.log('创建images存储桶');
        const { data: bucketData, error: bucketError } = await supabase.storage
          .createBucket('images', {
            public: true,
            allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif'],
            fileSizeLimit: 1024 * 1024,
          });

        if (bucketError) {
          console.error('创建存储桶失败:', bucketError);
          throw new Error(`创建存储桶失败: ${bucketError.message}`);
        }

        console.log('创建存储桶成功:', bucketData);
      }

      // 上传文件
      console.log('开始上传文件');
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('上传图标失败:', uploadError);
        throw new Error(`上传图标失败: ${uploadError.message}`);
      }

      console.log('文件上传成功');

      // 获取公共URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        console.error('获取公共URL失败, urlData:', urlData);
        throw new Error('获取图标公共URL失败');
      }

      console.log('获取到的图标URL:', urlData.publicUrl);

      // 更新社交链接中的图标URL
      setSettings(prev => {
        if (!prev) return prev;
        const newSocialLinks = prev.social_links.map(link => 
          link.id === linkId 
            ? { ...link, icon_url: urlData.publicUrl }
            : link
        );
        
        console.log('更新后的社交链接:', newSocialLinks);
        return { ...prev, social_links: newSocialLinks };
      });
      
      // 显示成功提示
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50';
      successMessage.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm">图标上传成功</p>
          </div>
        </div>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
      
    } catch (err: any) {
      console.error('上传图标错误:', err);
      setError(err.message || '图标上传失败');
      
      // 显示错误提示
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md z-50';
      errorMessage.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm">${err.message || '图标上传失败'}</p>
          </div>
        </div>
      `;
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const addNavItem = () => {
    if (!settings) return;
    const newItem = {
      id: crypto.randomUUID(),
      label: 'RGP & OK镜',
      href: '/rgpok',
      subItems: []
    };
    setSettings(prev => ({
      ...prev!,
      nav_items: [...prev!.nav_items, newItem]
    }));
  };

  const addSubNavItem = (parentId: string) => {
    if (!settings) return;
    const newSubItem = {
      id: crypto.randomUUID(),
      label: '新子菜单项',
      href: '#'
    };
    setSettings(prev => ({
      ...prev!,
      nav_items: prev!.nav_items.map(item =>
        item.id === parentId
          ? { ...item, subItems: [...(item.subItems || []), newSubItem] }
          : item
      )
    }));
  };

  const removeNavItem = (id: string) => {
    if (!settings) return;
    setSettings(prev => ({
      ...prev!,
      nav_items: prev!.nav_items.filter(item => item.id !== id)
    }));
  };

  const removeSubNavItem = (parentId: string, subItemId: string) => {
    if (!settings) return;
    setSettings(prev => ({
      ...prev!,
      nav_items: prev!.nav_items.map(item =>
        item.id === parentId
          ? {
              ...item,
              subItems: item.subItems?.filter(subItem => subItem.id !== subItemId)
            }
          : item
      )
    }));
  };

  const addSocialLink = () => {
    if (!settings) return;
    const newLink = {
      id: crypto.randomUUID(),
      platform: '新平台',
      url: '#',
      icon: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0z'
    };
    setSettings(prev => ({
      ...prev!,
      social_links: [...prev!.social_links, newLink]
    }));
  };

  const removeSocialLink = (id: string) => {
    if (!settings) return;
    setSettings(prev => ({
      ...prev!,
      social_links: prev!.social_links.filter(link => link.id !== id)
    }));
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      console.log(`开始上传Logo，文件名: ${file.name}, 类型: ${file.type}, 大小: ${file.size}字节`);

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Logo文件大小不能超过2MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      console.log(`准备上传文件到路径: ${filePath}`);

      // 检查images存储桶是否存在
      const { data: buckets, error: bucketsError } = await supabase.storage
        .listBuckets();
      
      console.log('存储桶列表:', buckets);
      
      if (bucketsError) {
        console.error('获取存储桶列表失败:', bucketsError);
        throw new Error(`获取存储桶列表失败: ${bucketsError.message}`);
      }
      
      const bucketExists = buckets?.some(b => b.name === 'images');
      console.log('images存储桶是否存在:', bucketExists);

      // 创建images存储桶（如果不存在）
      if (!bucketExists) {
        console.log('创建images存储桶');
        const { data: bucketData, error: bucketError } = await supabase.storage
          .createBucket('images', {
            public: true,
            allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif'],
            fileSizeLimit: 2 * 1024 * 1024,
          });

        if (bucketError) {
          console.error('创建存储桶失败:', bucketError);
          throw new Error(`创建存储桶失败: ${bucketError.message}`);
        }

        console.log('创建存储桶成功:', bucketData);
      }

      // 上传文件
      console.log('开始上传文件');
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('上传Logo失败:', uploadError);
        throw new Error(`上传Logo失败: ${uploadError.message}`);
      }

      console.log('文件上传成功');

      // 获取公共URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        console.error('获取公共URL失败, urlData:', urlData);
        throw new Error('获取Logo公共URL失败');
      }

      console.log('获取到的Logo URL:', urlData.publicUrl);

      // 更新设置中的Logo URL
      setSettings(prev => {
        if (!prev) return prev;
        return { ...prev, logo_url: urlData.publicUrl };
      });
      
      // 显示成功提示
      message.success('Logo上传成功');
    } catch (error) {
      const supabaseError = error as SupabaseError;
      console.error('Logo上传失败:', supabaseError);
      message.error(supabaseError.message || 'Logo上传失败,请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const switchTab = (id: string) => {
    setActiveSection(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-md">
        无法加载网站设置
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fixed Header with Save Button */}
      <div className="sticky top-0 z-10 bg-gray-50 -m-6 px-6 py-4 mb-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">网站设置</h2>
        <button
          onClick={handleSubmit}
          disabled={saving || isUploading}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200">
          <button
            className={`px-6 py-4 text-sm font-medium flex items-center whitespace-nowrap transition-colors duration-200 ${activeSection === 'basic' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
            onClick={() => switchTab('basic')}
            aria-current={activeSection === 'basic' ? 'page' : undefined}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              基本信息
            </span>
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium flex items-center whitespace-nowrap transition-colors duration-200 ${activeSection === 'seo' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
            onClick={() => switchTab('seo')}
            aria-current={activeSection === 'seo' ? 'page' : undefined}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              SEO设置
            </span>
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium flex items-center whitespace-nowrap transition-colors duration-200 ${activeSection === 'nav' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
            onClick={() => switchTab('nav')}
            aria-current={activeSection === 'nav' ? 'page' : undefined}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              导航菜单
            </span>
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium flex items-center whitespace-nowrap transition-colors duration-200 ${activeSection === 'social' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
            onClick={() => switchTab('social')}
            aria-current={activeSection === 'social' ? 'page' : undefined}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              社交媒体
            </span>
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium flex items-center whitespace-nowrap transition-colors duration-200 ${activeSection === 'company' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
            onClick={() => switchTab('company')}
            aria-current={activeSection === 'company' ? 'page' : undefined}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              公司信息
            </span>
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium flex items-center whitespace-nowrap transition-colors duration-200 ${activeSection === 'payment' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
            onClick={() => switchTab('payment')}
            aria-current={activeSection === 'payment' ? 'page' : undefined}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              支付配置
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本信息部分 */}
        <div id="basic" className="bg-white shadow-sm rounded-lg p-6" style={{ display: activeSection === 'basic' ? 'block' : 'none' }}>
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                网站Logo
              </label>
              {/* Logo上传功能将在这里实现 */}
              <div className="mt-1 flex items-center">
                {settings.logo_url ? (
                  <img 
                    src={settings.logo_url} 
                    alt="网站Logo" 
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="h-16 w-32 bg-gray-100 flex items-center justify-center rounded-md">
                    <span className="text-sm text-gray-500">暂无Logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="ml-4 cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  上传Logo
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SEO设置部分 */}
        <div id="seo" className="bg-white shadow-sm rounded-lg p-6" style={{ display: activeSection === 'seo' ? 'block' : 'none' }}>
          <h3 className="text-lg font-medium text-gray-900 mb-4">SEO设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                网站标题
              </label>
              <input
                aria-label="网站标题"
                type="text"
                value={settings.site_title}
                onChange={(e) => debouncedSetFormData({ site_title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                网站描述
              </label>
              <textarea
                rows={3}
                value={settings.site_description}
                onChange={(e) => debouncedSetFormData({ site_description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                关键词
              </label>
              <input
                type="text"
                value={settings.site_keywords}
                onChange={(e) => debouncedSetFormData({ site_keywords: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                多个关键词请用英文逗号分隔
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                作者
              </label>
              <input
                type="text"
                value={settings.site_author}
                onChange={(e) => debouncedSetFormData({ site_author: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 导航菜单设置 */}
        <div id="nav" className="bg-white shadow-sm rounded-lg p-6" style={{ display: activeSection === 'nav' ? 'block' : 'none' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">导航菜单</h3>
            <button
              type="button"
              onClick={addNavItem}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加导航项
            </button>
          </div>

          <div className="space-y-4">
            {settings.nav_items.map((item, index) => (
              <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-4">
                  <GripVertical className="w-5 h-5 text-gray-400 mt-2" />
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          菜单名称
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const newItems = [...settings.nav_items];
                            newItems[index] = { ...item, label: e.target.value };
                            setSettings(prev => ({ ...prev!, nav_items: newItems }));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          链接地址
                        </label>
                        <input
                          type="text"
                          value={item.href}
                          onChange={(e) => {
                            const newItems = [...settings.nav_items];
                            newItems[index] = { ...item, href: e.target.value };
                            setSettings(prev => ({ ...prev!, nav_items: newItems }));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* 子菜单项 */}
                    {item.subItems && item.subItems.length > 0 && (
                      <div className="pl-6 space-y-4">
                        {item.subItems.map((subItem, subIndex) => (
                          <div key={subItem.id} className="grid grid-cols-2 gap-4">
                            <div>
                              <input
                                type="text"
                                value={subItem.label}
                                onChange={(e) => {
                                  const newItems = [...settings.nav_items];
                                  newItems[index].subItems![subIndex] = {
                                    ...subItem,
                                    label: e.target.value
                                  };
                                  setSettings(prev => ({ ...prev!, nav_items: newItems }));
                                }}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="子菜单名称"
                              />
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={subItem.href}
                                onChange={(e) => {
                                  const newItems = [...settings.nav_items];
                                  newItems[index].subItems![subIndex] = {
                                    ...subItem,
                                    href: e.target.value
                                  };
                                  setSettings(prev => ({ ...prev!, nav_items: newItems }));
                                }}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="链接地址"
                              />
                              <button
                                type="button"
                                onClick={() => removeSubNavItem(item.id, subItem.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => addSubNavItem(item.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        + 添加子菜单
                      </button>
                      <button
                        type="button"
                        onClick={() => removeNavItem(item.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 社交媒体设置 */}
        <div id="social" className="bg-white shadow-sm rounded-lg p-6" style={{ display: activeSection === 'social' ? 'block' : 'none' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">社交媒体</h3>
            <button
              type="button"
              onClick={addSocialLink}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加社交平台
            </button>
          </div>

          <div className="space-y-4">
            {settings.social_links.map((link, index) => (
              <div key={link.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      平台名称
                    </label>
                    <input
                      type="text"
                      value={link.platform}
                      onChange={(e) => {
                        const newLinks = [...settings.social_links];
                        newLinks[index] = { ...link, platform: e.target.value };
                        setSettings(prev => ({ ...prev!, social_links: newLinks }));
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      链接地址
                    </label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...settings.social_links];
                        newLinks[index] = { ...link, url: e.target.value };
                        setSettings(prev => ({ ...prev!, social_links: newLinks }));
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      平台图标
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      <input
                        type="file"
                        accept="image/svg+xml,image/png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleIconUpload(file, link.id);
                        }}
                        className="hidden"
                        id={`icon-upload-${link.id}`}
                      />
                      <label
                        htmlFor={`icon-upload-${link.id}`}
                        className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        上传图标
                      </label>
                      {link.icon_url || link.icon ? (
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md">
                          {link.icon_url ? (
                            <img src={link.icon_url} alt={link.platform} className="w-6 h-6" />
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-6 h-6">
                              <path d={link.icon} />
                            </svg>
                          )}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeSocialLink(link.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 公司信息部分 */}
        <div id="company" className="bg-white shadow-sm rounded-lg p-6" style={{ display: activeSection === 'company' ? 'block' : 'none' }}>
          <h3 className="text-lg font-medium text-gray-900 mb-4">公司信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                公司名称
              </label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => {
                  const value = e.target.value;
                  setSettings(prev => prev ? { ...prev, company_name: value } : null);
                  debouncedSetFormData({ company_name: value });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ICP备案号
              </label>
              <input
                type="text"
                value={settings.icp_number}
                onChange={(e) => debouncedSetFormData({ icp_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ICP备案链接
              </label>
              <input
                type="url"
                value={settings.icp_link}
                onChange={(e) => debouncedSetFormData({ icp_link: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                营业执照号
              </label>
              <input
                type="text"
                value={settings.business_license}
                onChange={(e) => debouncedSetFormData({ business_license: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                营业执照链接
              </label>
              <input
                type="url"
                value={settings.business_license_link}
                onChange={(e) => debouncedSetFormData({ business_license_link: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 支付配置部分 */}
        <div id="payment" className="bg-white shadow-sm rounded-lg p-6" style={{ display: activeSection === 'payment' ? 'block' : 'none' }}>
          <h3 className="text-lg font-medium text-gray-900 mb-4">支付配置</h3>
          
          {/* 支付宝配置 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-800">支付宝配置</h4>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={settings.payment_config?.alipay?.enabled || false}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        alipay: {
                          ...prev.payment_config.alipay,
                          enabled
                        }
                      }
                    } : null);
                  }}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">启用支付宝</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  App ID
                </label>
                <input
                  type="text"
                  value={settings.payment_config?.alipay?.app_id || ''}
                  onChange={(e) => {
                    const app_id = e.target.value;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        alipay: {
                          ...prev.payment_config.alipay,
                          app_id
                        }
                      }
                    } : null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  公钥
                </label>
                <textarea
                  rows={3}
                  value={settings.payment_config?.alipay?.public_key || ''}
                  onChange={(e) => {
                    const public_key = e.target.value;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        alipay: {
                          ...prev.payment_config.alipay,
                          public_key
                        }
                      }
                    } : null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  私钥
                </label>
                <textarea
                  rows={3}
                  value={settings.payment_config?.alipay?.private_key || ''}
                  onChange={(e) => {
                    const private_key = e.target.value;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        alipay: {
                          ...prev.payment_config.alipay,
                          private_key
                        }
                      }
                    } : null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="inline-flex items-center mt-6">
                  <input
                    type="checkbox"
                    checked={settings.payment_config?.alipay?.sandbox_mode || false}
                    onChange={(e) => {
                      const sandbox_mode = e.target.checked;
                      setSettings(prev => prev ? {
                        ...prev,
                        payment_config: {
                          ...prev.payment_config,
                          alipay: {
                            ...prev.payment_config.alipay,
                            sandbox_mode
                          }
                        }
                      } : null);
                    }}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">沙箱模式</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* 微信支付配置 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-800">微信支付配置</h4>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={settings.payment_config?.wechat?.enabled || false}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        wechat: {
                          ...prev.payment_config.wechat,
                          enabled
                        }
                      }
                    } : null);
                  }}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">启用微信支付</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  App ID
                </label>
                <input
                  type="text"
                  value={settings.payment_config?.wechat?.app_id || ''}
                  onChange={(e) => {
                    const app_id = e.target.value;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        wechat: {
                          ...prev.payment_config.wechat,
                          app_id
                        }
                      }
                    } : null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  商户号 (Mch ID)
                </label>
                <input
                  type="text"
                  value={settings.payment_config?.wechat?.mch_id || ''}
                  onChange={(e) => {
                    const mch_id = e.target.value;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        wechat: {
                          ...prev.payment_config.wechat,
                          mch_id
                        }
                      }
                    } : null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  API 密钥
                </label>
                <input
                  type="text"
                  value={settings.payment_config?.wechat?.api_key || ''}
                  onChange={(e) => {
                    const api_key = e.target.value;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        wechat: {
                          ...prev.payment_config.wechat,
                          api_key
                        }
                      }
                    } : null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  App Secret
                </label>
                <input
                  type="text"
                  value={settings.payment_config?.wechat?.app_secret || ''}
                  onChange={(e) => {
                    const app_secret = e.target.value;
                    setSettings(prev => prev ? {
                      ...prev,
                      payment_config: {
                        ...prev.payment_config,
                        wechat: {
                          ...prev.payment_config.wechat,
                          app_secret
                        }
                      }
                    } : null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="inline-flex items-center mt-6">
                  <input
                    type="checkbox"
                    checked={settings.payment_config?.wechat?.sandbox_mode || false}
                    onChange={(e) => {
                      const sandbox_mode = e.target.checked;
                      setSettings(prev => prev ? {
                        ...prev,
                        payment_config: {
                          ...prev.payment_config,
                          wechat: {
                            ...prev.payment_config.wechat,
                            sandbox_mode
                          }
                        }
                      } : null);
                    }}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">沙箱模式</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving || isUploading}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </form>
    </div>
  );
}