import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Save, Plus, Trash2, GripVertical, Upload } from 'lucide-react';

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
}

export default function SiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('site_settings')
        .update(settings)
        .eq('id', settings.id);

      if (error) throw error;
      
      // Show success message
      alert('设置已保存');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (file: File, linkId: string) => {
    try {
      setIsUploading(true);
      setError(null);

      if (file.size > 1 * 1024 * 1024) {
        throw new Error('图标文件大小不能超过1MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${linkId}.${fileExt}`;
      const filePath = `icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Update the icon URL in the social links array
      setSettings(prev => {
        if (!prev) return prev;
        const newSocialLinks = prev.social_links.map(link => 
          link.id === linkId 
            ? { ...link, icon_url: urlData.publicUrl }
            : link
        );
        return { ...prev, social_links: newSocialLinks };
      });
    } catch (err: any) {
      console.error('Error uploading icon:', err);
      setError(err.message || '图标上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const addNavItem = () => {
    if (!settings) return;
    const newItem = {
      id: crypto.randomUUID(),
      label: '新菜单项',
      href: '#',
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

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本信息部分 */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                网站标题
              </label>
              <input
                type="text"
                value={settings.site_title}
                onChange={(e) => setSettings(prev => ({ ...prev!, site_title: e.target.value }))}
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
                onChange={(e) => setSettings(prev => ({ ...prev!, site_description: e.target.value }))}
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
                onChange={(e) => setSettings(prev => ({ ...prev!, site_keywords: e.target.value }))}
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
                onChange={(e) => setSettings(prev => ({ ...prev!, site_author: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 导航菜单设置 */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">导航菜单</h3>
            <button
              type="button"
              onClick={addNavItem}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加菜单项
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
        <div className="bg-white shadow-sm rounded-lg p-6">
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
                      {link.icon && (
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md">
                          <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path d={link.icon} />
                          </svg>
                        </div>
                      )}
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
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">公司信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                公司名称
              </label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings(prev => ({ ...prev!, company_name: e.target.value }))}
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
                onChange={(e) => setSettings(prev => ({ ...prev!, icp_number: e.target.value }))}
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
                onChange={(e) => setSettings(prev => ({ ...prev!, icp_link: e.target.value }))}
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
                onChange={(e) => setSettings(prev => ({ ...prev!, business_license: e.target.value }))}
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
                onChange={(e) => setSettings(prev => ({ ...prev!, business_license_link: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
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