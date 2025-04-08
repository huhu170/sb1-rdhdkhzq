import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Upload, Link as LinkIcon, Video, Film, Type, Eye, Info } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RGPOKFormProps {
  content?: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    video_url?: string;
    content: string;
    is_active: boolean;
    order: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function RGPOKForm({ content, onClose, onSuccess }: RGPOKFormProps) {
  const [formData, setFormData] = useState({
    title: content?.title || '',
    description: content?.description || '',
    image_url: content?.image_url || '',
    video_url: content?.video_url || '',
    content: content?.content || '',
    is_active: content?.is_active ?? true,
    order: content?.order || 0
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoPreviewShown, setVideoPreviewShown] = useState(false);
  const [videoType, setVideoType] = useState<'embed' | 'upload'>('embed');

  // 富文本编辑器配置
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };
  
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];

  // 处理视频类型变更
  useEffect(() => {
    if (videoType === 'upload' && formData.video_url?.includes('http')) {
      setFormData(prev => ({ ...prev, video_url: '' }));
    }
  }, [videoType]);

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('图片大小不能超过10MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `rgpok/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        image_url: urlData.publicUrl
      }));
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || '图片上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  // 处理视频上传
  const handleVideoUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      // 验证文件格式
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('只支持 MP4、WebM 和 MOV 格式的视频');
      }

      // 限制文件大小为50MB (Supabase免费版限制)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Supabase免费版视频大小不能超过50MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `rgpok/${fileName}`; // 使用rgpok文件夹存储

      console.log('正在上传视频:', {
        fileName,
        fileSize: file.size,
        fileType: file.type,
        filePath
      });

      try {
        // 使用标准的上传方法，直接调用Supabase API
        console.log('开始上传视频...');
        
        // 设置上传进度跟踪函数
        const handleProgress = (progress: number) => {
          setUploadProgress(Math.round(progress));
        };
        
        // 模拟进度更新，因为Supabase的upload方法不提供进度回调
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            // 随机递增进度，但不超过95%（保留最后5%用于完成操作）
            const increment = Math.random() * 5 + 1;
            const newProgress = prev + increment;
            return newProgress > 95 ? 95 : Math.round(newProgress);
          });
        }, 300);
        
        // 直接使用Supabase的upload方法
        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });
        
        // 清除进度更新计时器
        clearInterval(progressInterval);
        
        if (uploadError) {
          console.error('上传视频失败:', uploadError);
          throw new Error(uploadError.message || '上传视频失败');
        }
        
        // 设置进度为100%
        setUploadProgress(100);
        console.log('视频上传成功:', uploadResult);
        
        // 获取公开访问URL
        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
          throw new Error('获取视频URL失败');
        }
        
        const publicUrl = urlData.publicUrl;
        console.log('视频公开访问URL:', publicUrl);
        
        // 设置视频类型为upload
        setVideoType('upload');
        
        // 更新表单数据
        setFormData(prev => ({
          ...prev,
          video_url: publicUrl
        }));

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
              <p class="text-sm">视频上传成功</p>
            </div>
          </div>
        `;
        document.body.appendChild(successMessage);
        setTimeout(() => {
          document.body.removeChild(successMessage);
        }, 3000);

        // 自动显示视频预览
        setVideoPreviewShown(true);

      } catch (err: any) {
        console.error('视频上传错误:', err);
        setError(err.message || '视频上传失败');
        // 清除已上传的视频 URL
        setFormData(prev => ({
          ...prev,
          video_url: ''
        }));
      } finally {
        setIsUploading(false);
        // 不要重置进度，让用户可以看到最终进度
        setTimeout(() => {
          setUploadProgress(0);
        }, 2000);
      }
    } catch (err: any) {
      console.error('视频上传错误:', err);
      setError(err.message || '视频上传失败');
      // 清除已上传的视频 URL
      setFormData(prev => ({
        ...prev,
        video_url: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 表单验证
      if (!formData.title.trim()) {
        throw new Error('标题不能为空');
      }

      if (!formData.image_url) {
        throw new Error('请上传图片');
      }

      // 如果有视频URL，验证其有效性
      if (formData.video_url && !validateVideoUrl(formData.video_url)) {
        throw new Error('请输入有效的视频链接');
      }

      const data = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        image_url: formData.image_url,
        video_url: formData.video_url.trim() || null,
        content: formData.content || '',
        is_active: formData.is_active,
        order: formData.order,
        updated_at: new Date().toISOString()
      };

      console.log('准备保存数据:', JSON.stringify(data, null, 2));

      let result;
      
      if (content?.id) {
        // 更新现有内容
        console.log('正在更新内容，ID:', content.id);
        const { data: updateResult, error: updateError } = await supabase
          .from('rgpok_contents')
          .update(data)
          .eq('id', content.id)
          .select();

        if (updateError) {
          console.error('更新错误:', updateError);
          throw new Error(`更新失败: ${updateError.message}`);
        }

        result = updateResult;
        console.log('更新成功:', result);
      } else {
        // 创建新内容
        console.log('正在创建新内容');
        
        // 创建新记录
        const insertData = {
          ...data,
          created_at: new Date().toISOString()
        };

        console.log('插入数据:', JSON.stringify(insertData, null, 2));

        const { data: insertResult, error: insertError } = await supabase
          .from('rgpok_contents')
          .insert([insertData])
          .select();

        if (insertError) {
          console.error('创建错误:', insertError);
          throw new Error(`创建失败: ${insertError.message || '未知错误'}`);
        }

        if (!insertResult || insertResult.length === 0) {
          throw new Error('创建失败: 未返回创建的记录');
        }

        result = insertResult;
        console.log('创建成功:', result);
      }

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
            <p class="text-sm">保存成功</p>
          </div>
        </div>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);

      // 刷新列表并关闭表单
      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error('保存内容时出错:', err);
      setError(err.message || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 验证视频URL (YouTube、哔哩哔哩等)
  const validateVideoUrl = (url: string) => {
    // 允许为空
    if (!url.trim()) return true;
    
    // 如果是上传类型，则验证是否为视频URL
    if (videoType === 'upload') {
      return url.startsWith('https://') && 
        (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov'));
    }
    
    // 嵌入类型验证
    const videoPatterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
      /^(https?:\/\/)?(www\.)?(bilibili\.com)\/.+$/i,
      /^(https?:\/\/)?(player\.)?(vimeo\.com)\/.+$/i,
      /^(https?:\/\/)?(v\.)?qq\.com\/.+$/i
    ];
    
    return videoPatterns.some(pattern => pattern.test(url));
  };

  // 获取嵌入视频预览代码
  const getVideoEmbedCode = () => {
    let videoUrl = formData.video_url;
    if (!videoUrl) return null;

    try {
      // 如果是直接上传的视频文件，返回原始URL
      if (videoUrl.match(/\.(mp4|webm|mov)$/i)) {
        return videoUrl;
      }

      // 转换YouTube URL为嵌入格式
      if (videoUrl.includes('youtube.com/watch')) {
        const videoId = new URL(videoUrl).searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      
      // 转换YouTube短链接为嵌入格式
      if (videoUrl.includes('youtu.be')) {
        const videoId = videoUrl.split('/').pop();
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      
      // 转换哔哩哔哩URL
      if (videoUrl.includes('bilibili.com/video')) {
        const bvid = videoUrl.match(/video\/(BV[\w]+)/);
        return bvid?.[1] ? `https://player.bilibili.com/player.html?bvid=${bvid[1]}&page=1` : null;
      }

      // 如果已经是嵌入格式，直接返回
      if (videoUrl.includes('/embed/') || videoUrl.includes('player.bilibili.com')) {
        return videoUrl;
      }

      return null;
    } catch (error) {
      console.error('解析视频URL失败:', error);
      return null;
    }
  };

  // 渲染视频预览
  const renderVideoPreview = () => {
    if (!formData.video_url) return null;
    
    if (videoType === 'upload') {
      // 检查是否是直接上传的视频文件
      const isDirectVideo = formData.video_url.match(/\.(mp4|webm|mov)$/i);
      if (isDirectVideo) {
        return (
          <video 
            src={formData.video_url} 
            controls 
            className="w-full aspect-video rounded"
            controlsList="nodownload"
            onContextMenu={e => e.preventDefault()}
          >
            <source src={formData.video_url} type={`video/${isDirectVideo[1]}`} />
            您的浏览器不支持视频播放
          </video>
        );
      }
      return (
        <div className="w-full aspect-video rounded bg-gray-100 flex items-center justify-center text-gray-500">
          无效的视频文件格式
        </div>
      );
    }

    // 嵌入视频预览
    const embedUrl = getVideoEmbedCode();
    if (!embedUrl) {
      return (
        <div className="w-full aspect-video rounded bg-gray-100 flex items-center justify-center text-gray-500">
          无效的视频链接
        </div>
      );
    }

    return (
      <iframe
        src={embedUrl}
        className="w-full aspect-video rounded"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-10">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {content ? '编辑RGP&OK镜内容' : '添加RGP&OK镜内容'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                标题 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                排序
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                数字越小，排序越靠前
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              简介描述
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                图片 <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  选择图片
                </label>
                {isUploading && (
                  <div className="ml-4 text-sm text-gray-500">上传中...</div>
                )}
              </div>
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="h-32 w-full object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                视频 (选填)
              </label>
              <div className="flex items-center space-x-3 mb-3">
                <button
                  type="button"
                  onClick={() => setVideoType('embed')}
                  className={`px-3 py-1 text-sm rounded-md flex items-center ${
                    videoType === 'embed' 
                      ? 'bg-indigo-100 text-indigo-800 font-medium' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Film className="w-4 h-4 mr-1" />
                  嵌入视频
                </button>
                <button
                  type="button"
                  onClick={() => setVideoType('upload')}
                  className={`px-3 py-1 text-sm rounded-md flex items-center ${
                    videoType === 'upload' 
                      ? 'bg-indigo-100 text-indigo-800 font-medium' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  上传视频
                </button>
              </div>

              {videoType === 'embed' ? (
                <div className="space-y-2">
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LinkIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.video_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://www.youtube.com/embed/..."
                      className={`pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        formData.video_url && !validateVideoUrl(formData.video_url) 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : ''
                      }`}
                    />
                  </div>
                  {formData.video_url && !validateVideoUrl(formData.video_url) && (
                    <p className="mt-1 text-sm text-red-600">请输入有效的视频嵌入URL</p>
                  )}
                  <p className="text-xs text-gray-500">
                    支持YouTube、哔哩哔哩等平台的嵌入链接
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file);
                      }}
                      className="hidden"
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Video className="w-5 h-5 mr-2" />
                      选择视频
                    </label>
                    {isUploading && (
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-500">上传中...</span>
                          <span className="text-sm text-gray-500">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    支持MP4、WebM格式，大小不超过50MB（Supabase免费版限制）
                  </p>
                </div>
              )}

              {formData.video_url && (
                <div className="mt-2">
                  {videoPreviewShown ? (
                    <div className="relative">
                      {renderVideoPreview()}
                      <button
                        type="button"
                        onClick={() => setVideoPreviewShown(false)}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVideoPreviewShown(true)}
                      className="flex items-center text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md px-3 py-1 text-sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      预览视频
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              详细内容
            </label>
            <ReactQuill
              theme="snow"
              value={formData.content}
              onChange={(content: string) => setFormData(prev => ({ ...prev, content }))}
              modules={modules}
              formats={formats}
              className="h-64 mb-12"
            />
            <p className="mt-1 text-xs text-gray-500 flex items-center">
              <Info className="w-3 h-3 inline mr-1" />
              富文本编辑器支持粗体、斜体、列表等格式
            </p>
          </div>

          <div className="flex items-center pt-4">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              启用内容 (公开显示)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || isUploading || (formData.video_url !== '' && !validateVideoUrl(formData.video_url))}
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