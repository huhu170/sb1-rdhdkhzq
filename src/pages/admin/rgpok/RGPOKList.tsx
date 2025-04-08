import React, { useEffect, useState } from 'react';
import { supabase, handleSupabaseError, retryOperation } from '../../../lib/supabase';
import { Plus, Search, Edit, Trash2, Play, Eye, ChevronUp, ChevronDown, Filter, Video, Clipboard, CheckCircle, XCircle } from 'lucide-react';
import RGPOKForm from './RGPOKForm';
import { Link } from 'react-router-dom';

interface RGPOKContent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  content: string;
  is_active: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export default function RGPOKList() {
  const [contents, setContents] = useState<RGPOKContent[]>([]);
  const [filteredContents, setFilteredContents] = useState<RGPOKContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<RGPOKContent | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'title' | 'order' | 'is_active' | 'created_at'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchContents();
  }, []);

  // 根据搜索和筛选更新显示的内容
  useEffect(() => {
    let result = [...contents];
    
    // 应用筛选
    if (filter === 'active') {
      result = result.filter(item => item.is_active);
    } else if (filter === 'inactive') {
      result = result.filter(item => !item.is_active);
    }
    
    // 应用搜索
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(
        content => 
          content.title.toLowerCase().includes(lowercasedTerm) ||
          content.description.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    // 应用排序
    result.sort((a, b) => {
      let valA, valB;
      
      // 根据字段获取值
      if (sortField === 'created_at') {
        valA = new Date(a.created_at || '').getTime();
        valB = new Date(b.created_at || '').getTime();
      } else if (sortField === 'is_active') {
        valA = a.is_active ? 1 : 0;
        valB = b.is_active ? 1 : 0;
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }
      
      // 比较并考虑排序方向
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
    
    setFilteredContents(result);
  }, [contents, searchTerm, sortField, sortDirection, filter]);

  const fetchContents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('正在获取内容列表...');
      
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('rgpok_contents')
          .select('*')
          .order('order', { ascending: true });
      });
      
      if (error) {
        console.error('获取内容列表失败:', error);
        throw error;
      }
      
      if (data) {
        console.log('获取内容列表成功:', data);
        setContents(data);
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching RGP/OK contents');
      console.error('处理错误:', handledError);
      setError(handledError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除此内容吗？')) {
      try {
        const { error } = await supabase
          .from('rgpok_contents')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        fetchContents();
        setSelectedItems(selectedItems.filter(item => item !== id));
      } catch (err: any) {
        const handledError = handleSupabaseError(err, 'deleting RGP/OK content');
        setError(handledError.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    if (window.confirm(`确定要删除所选的 ${selectedItems.length} 项内容吗？`)) {
      try {
        const { error } = await supabase
          .from('rgpok_contents')
          .delete()
          .in('id', selectedItems);
        
        if (error) throw error;
        fetchContents();
        setSelectedItems([]);
      } catch (err: any) {
        const handledError = handleSupabaseError(err, 'bulk deleting RGP/OK contents');
        setError(handledError.message);
      }
    }
  };

  const handleBulkToggleActive = async (setActive: boolean) => {
    if (selectedItems.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('rgpok_contents')
        .update({ is_active: setActive })
        .in('id', selectedItems);
      
      if (error) throw error;
      fetchContents();
    } catch (err: any) {
      const handledError = handleSupabaseError(err, `updating RGP/OK contents status to ${setActive}`);
      setError(handledError.message);
    }
  };

  const handlePreview = () => {
    window.open('/rgpok', '_blank');
  };

  const handlePlayVideo = (videoUrl: string) => {
    setVideoPreview(videoUrl);
  };

  const handleToggleAllSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(filteredContents.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleToggleSelected = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const contentIndex = contents.findIndex(c => c.id === id);
    if (contentIndex === -1) return;
    
    const newContents = [...contents];
    const currentItem = newContents[contentIndex];
    
    if (direction === 'up' && contentIndex > 0) {
      // 与上一项交换顺序
      const prevItem = newContents[contentIndex - 1];
      const tempOrder = currentItem.order;
      
      try {
        await Promise.all([
          supabase.from('rgpok_contents').update({ order: prevItem.order }).eq('id', currentItem.id),
          supabase.from('rgpok_contents').update({ order: tempOrder }).eq('id', prevItem.id)
        ]);
        
        fetchContents();
      } catch (err: any) {
        const handledError = handleSupabaseError(err, 'reordering RGP/OK content');
        setError(handledError.message);
      }
    } else if (direction === 'down' && contentIndex < contents.length - 1) {
      // 与下一项交换顺序
      const nextItem = newContents[contentIndex + 1];
      const tempOrder = currentItem.order;
      
      try {
        await Promise.all([
          supabase.from('rgpok_contents').update({ order: nextItem.order }).eq('id', currentItem.id),
          supabase.from('rgpok_contents').update({ order: tempOrder }).eq('id', nextItem.id)
        ]);
        
        fetchContents();
      } catch (err: any) {
        const handledError = handleSupabaseError(err, 'reordering RGP/OK content');
        setError(handledError.message);
      }
    }
  };

  const copyVideoUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => {
        setError('复制视频链接失败');
      }
    );
  };

  // 切换排序
  const toggleSort = (field: 'title' | 'order' | 'is_active' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <h1 className="text-xl font-semibold text-gray-900">RGP & OK镜内容管理</h1>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handlePreview}
            className="flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
          >
            <Eye className="w-4 h-4 mr-2" />
            预览页面
          </button>
          <button
            onClick={() => {
              setSelectedContent(null);
              setShowForm(true);
            }}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加内容
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700 rounded-md">
          <p className="font-semibold">加载失败</p>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* 搜索和筛选栏 */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
          {/* 搜索框 */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜索内容..."
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* 筛选器 */}
            <div className="relative">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">全部内容</option>
                <option value="active">已启用</option>
                <option value="inactive">已禁用</option>
              </select>
            </div>
            
            {/* 批量操作按钮 */}
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkToggleActive(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  批量启用
                </button>
                <button
                  onClick={() => handleBulkToggleActive(false)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  批量禁用
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  批量删除
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredContents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-12 px-3 py-3 text-left">
                    <input 
                      type="checkbox" 
                      onChange={handleToggleAllSelected}
                      checked={selectedItems.length > 0 && selectedItems.length === filteredContents.length}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th scope="col" className="w-20 px-3 py-3 text-left"></th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('title')}
                  >
                    <div className="flex items-center">
                      标题
                      {sortField === 'title' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('order')}
                  >
                    <div className="flex items-center">
                      排序
                      {sortField === 'order' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('is_active')}
                  >
                    <div className="flex items-center">
                      状态
                      {sortField === 'is_active' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    视频
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    排序
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContents.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleToggleSelected(item.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-12 w-16 object-cover rounded"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.order}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.is_active ? '已启用' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {item.video_url ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePlayVideo(item.video_url || '')}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="预览视频"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => copyVideoUrl(item.video_url || '')}
                            className="text-gray-600 hover:text-gray-900"
                            title="复制视频链接"
                          >
                            <Clipboard className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">无视频</span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleReorder(item.id, 'up')}
                          disabled={filteredContents.indexOf(item) === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReorder(item.id, 'down')}
                          disabled={filteredContents.indexOf(item) === filteredContents.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setSelectedContent(item);
                            setShowForm(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到内容</h3>
            <p className="mt-1 text-sm text-gray-500">
              开始创建第一个RGP&OK镜内容
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedContent(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                添加内容
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <RGPOKForm
          content={selectedContent}
          onClose={() => {
            setShowForm(false);
            setSelectedContent(null);
          }}
          onSuccess={() => {
            fetchContents();
            setShowForm(false);
            setSelectedContent(null);
          }}
        />
      )}

      {/* 视频预览 */}
      {videoPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl w-full p-2">
            <button
              onClick={() => setVideoPreview(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="relative aspect-video">
              {videoPreview.includes('.mp4') || videoPreview.includes('.webm') || videoPreview.includes('.mov') ? (
                <video src={videoPreview} controls className="w-full h-full" autoPlay />
              ) : (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={videoPreview}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 复制成功提示 */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm">已复制视频链接到剪贴板</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 