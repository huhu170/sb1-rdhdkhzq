import React, { useEffect, useState } from 'react';
import { supabase, handleSupabaseError, retryOperation } from '../../lib/supabase';
import { Play, Info } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

interface RGPOKContent {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  content: string;
  is_active: boolean;
  order: number;
}

export default function RGPOKPage() {
  const [contents, setContents] = useState<RGPOKContent[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('rgpok_contents')
          .select('*')
          .eq('is_active', true)
          .order('order');
      });
      
      if (error) throw error;
      if (data) {
        setContents(data);
        // 不再自动设置默认播放视频
        // const firstWithVideo = data.find(item => item.video_url);
        // if (firstWithVideo) {
        //   setActiveVideo(firstWithVideo.video_url || null);
        // }
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching RGP/OK contents');
      setError(handledError.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理视频播放
  const handlePlayVideo = (videoUrl: string) => {
    setActiveVideo(videoUrl);
    // 视频模态框逻辑
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
  };

  // 关闭视频
  const closeVideoModal = () => {
    setActiveVideo(null);
    document.body.style.overflow = '';
  };

  // 加载中状态显示
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
        <Footer />
      </>
    );
  }

  // 错误状态显示
  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-red-50 p-6 rounded-lg">
            <h3 className="text-red-800 font-semibold text-lg">加载失败</h3>
            <p className="text-red-600 mt-2">{error}</p>
            <button 
              onClick={fetchContents}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              重试
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        {/* 视频模态框 */}
        {activeVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
            <div className="relative w-full max-w-4xl">
              <button
                onClick={closeVideoModal}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="relative aspect-video">
                {typeof activeVideo === 'string' && activeVideo.match(/\.(mp4|webm|mov)$/i) ? (
                  <video
                    src={activeVideo}
                    controls
                    autoPlay
                    className="absolute inset-0 w-full h-full"
                    controlsList="nodownload"
                    onContextMenu={e => e.preventDefault()}
                  >
                    您的浏览器不支持视频播放
                  </video>
                ) : (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={typeof activeVideo === 'string' ? activeVideo : ''}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">RGP & OK镜</h1>
            <p className="text-xl text-gray-600">专业视力矫正解决方案</p>
          </div>

          <div className="space-y-24">
            {contents.map((content, index) => (
              <div key={content.id} className={`flex flex-col md:flex-row items-center gap-8 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                <div className="md:w-1/2 relative group">
                  <img
                    src={content.image_url}
                    alt={content.title}
                    className="rounded-xl shadow-lg w-full aspect-video object-cover"
                    loading="lazy"
                    width="640"
                    height="360"
                  />
                  {content.video_url && (
                    <button
                      onClick={() => handlePlayVideo(content.video_url || '')}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 group-hover:bg-opacity-60 transition-all rounded-xl"
                    >
                      <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 ml-1" />
                      </div>
                    </button>
                  )}
                </div>
                <div className="md:w-1/2">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">{content.title}</h2>
                  <p className="text-gray-600 text-lg mb-6">{content.description}</p>
                  <div 
                    className="prose prose-indigo max-w-none"
                    dangerouslySetInnerHTML={{ __html: content.content }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* 信息框 */}
          <div className="mt-20 bg-indigo-50 rounded-xl p-8 shadow-sm">
            <div className="flex items-start">
              <Info className="w-8 h-8 text-indigo-600 mr-4 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">了解更多关于RGP和OK镜</h3>
                <p className="text-gray-700">
                  希乔尔提供专业的RGP(硬性透气性隐形眼镜)和OK镜(角膜塑形镜)定制服务。这些先进的视力矫正产品能够帮助您摆脱眼镜和传统隐形眼镜的束缚，拥有更清晰的视力和更舒适的使用体验。
                </p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <button className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                    预约咨询
                  </button>
                  <button className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                    查看产品详情
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 