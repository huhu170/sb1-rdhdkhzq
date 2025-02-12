import React, { useEffect, useState, useRef, TouchEvent } from 'react';
import { supabase, handleSupabaseError, retryOperation } from '../lib/supabase';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  image_url: string;
  created_at: string;
}

export default function Blog() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout>();
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollingRef = useRef(false);
  const dragStartTimeRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const lastMouseXRef = useRef(0);
  const velocityRef = useRef(0);
  const momentumFrameRef = useRef<number>();

  useEffect(() => {
    fetchArticles();
    checkMobile();
    startAutoScroll();
    
    window.addEventListener('resize', checkMobile);
    
    const channel = supabase
      .channel('articles_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'articles' },
        () => {
          fetchArticles();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('resize', checkMobile);
      supabase.removeChannel(channel);
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      if (momentumFrameRef.current) {
        cancelAnimationFrame(momentumFrameRef.current);
      }
    };
  }, []);

  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('articles')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
      });
      
      if (error) throw error;
      
      if (data) {
        setArticles(data);
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching articles');
      setError(handledError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }

    autoScrollIntervalRef.current = setInterval(() => {
      if (scrollContainerRef.current && !isDraggingRef.current && !selectedArticle && !scrollingRef.current && !isHovering) {
        scrollingRef.current = true;
        handleNext();
        setTimeout(() => {
          scrollingRef.current = false;
        }, 1000);
      }
    }, 3000);
  };

  const handlePrevious = () => {
    if (!scrollContainerRef.current || scrollingRef.current) return;
    scrollingRef.current = true;
    
    const container = scrollContainerRef.current;
    const itemWidth = isMobile ? container.offsetWidth : container.offsetWidth / 6 + 16;
    let newIndex = currentIndex - 1;
    
    if (newIndex < 0) {
      newIndex = articles.length - 1;
      container.scrollLeft = container.scrollWidth;
    }
    
    container.scrollTo({
      left: itemWidth * newIndex,
      behavior: 'smooth'
    });
    
    setCurrentIndex(newIndex);
    setTimeout(() => {
      scrollingRef.current = false;
    }, 500);
  };

  const handleNext = () => {
    if (!scrollContainerRef.current || scrollingRef.current) return;
    scrollingRef.current = true;
    
    const container = scrollContainerRef.current;
    const itemWidth = isMobile ? container.offsetWidth : container.offsetWidth / 6 + 16;
    let newIndex = currentIndex + 1;
    
    if (newIndex >= articles.length) {
      newIndex = 0;
      container.scrollLeft = 0;
    }
    
    container.scrollTo({
      left: itemWidth * newIndex,
      behavior: 'smooth'
    });
    
    setCurrentIndex(newIndex);
    setTimeout(() => {
      scrollingRef.current = false;
    }, 500);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (momentumFrameRef.current) {
      cancelAnimationFrame(momentumFrameRef.current);
    }
    
    isDraggingRef.current = true;
    dragStartTimeRef.current = Date.now();
    startXRef.current = e.pageX;
    lastMouseXRef.current = e.pageX;
    scrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
    dragDistanceRef.current = 0;
    velocityRef.current = 0;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    
    const deltaX = e.pageX - lastMouseXRef.current;
    const now = Date.now();
    const dt = now - dragStartTimeRef.current;
    
    if (dt > 0) {
      velocityRef.current = deltaX / dt;
    }
    
    dragStartTimeRef.current = now;
    lastMouseXRef.current = e.pageX;
    
    const dx = e.pageX - startXRef.current;
    dragDistanceRef.current = Math.abs(dx);
    
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - dx;
    e.preventDefault();
  };

  const applyMomentum = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const deceleration = 0.95;
    let velocity = velocityRef.current * 50;

    const animate = () => {
      if (Math.abs(velocity) > 0.1 && !isDraggingRef.current) {
        container.scrollLeft -= velocity;
        velocity *= deceleration;
        momentumFrameRef.current = requestAnimationFrame(animate);
      } else {
        const itemWidth = isMobile ? container.offsetWidth : container.offsetWidth / 6 + 16;
        const newIndex = Math.round(container.scrollLeft / itemWidth);
        setCurrentIndex(newIndex);
        container.scrollTo({
          left: itemWidth * newIndex,
          behavior: 'smooth'
        });
      }
    };

    animate();
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    const dragDuration = Date.now() - dragStartTimeRef.current;
    
    if (dragDuration < 100 && Math.abs(velocityRef.current) > 0.5) {
      applyMomentum();
    } else {
      if (scrollContainerRef.current) {
        const itemWidth = isMobile ? scrollContainerRef.current.offsetWidth : scrollContainerRef.current.offsetWidth / 6 + 16;
        const newIndex = Math.round(scrollContainerRef.current.scrollLeft / itemWidth);
        setCurrentIndex(newIndex);
        scrollContainerRef.current.scrollTo({
          left: itemWidth * newIndex,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      handleMouseUp(new MouseEvent('mouseup'));
    }
    setIsHovering(false);
    startAutoScroll();
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (momentumFrameRef.current) {
      cancelAnimationFrame(momentumFrameRef.current);
    }
    
    isDraggingRef.current = true;
    dragStartTimeRef.current = Date.now();
    startXRef.current = e.touches[0].pageX;
    lastMouseXRef.current = e.touches[0].pageX;
    scrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
    dragDistanceRef.current = 0;
    velocityRef.current = 0;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.pageX - lastMouseXRef.current;
    const now = Date.now();
    const dt = now - dragStartTimeRef.current;
    
    if (dt > 0) {
      velocityRef.current = deltaX / dt;
    }
    
    dragStartTimeRef.current = now;
    lastMouseXRef.current = touch.pageX;
    
    const dx = touch.pageX - startXRef.current;
    dragDistanceRef.current = Math.abs(dx);
    
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - dx;
    e.preventDefault();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    
    const dragDuration = Date.now() - dragStartTimeRef.current;
    
    if (dragDuration < 100 && Math.abs(velocityRef.current) > 0.5) {
      applyMomentum();
    } else {
      if (scrollContainerRef.current) {
        const itemWidth = isMobile ? scrollContainerRef.current.offsetWidth : scrollContainerRef.current.offsetWidth / 6 + 16;
        const newIndex = Math.round(scrollContainerRef.current.scrollLeft / itemWidth);
        setCurrentIndex(newIndex);
        scrollContainerRef.current.scrollTo({
          left: itemWidth * newIndex,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleArticleClick = (article: Article) => {
    if (dragDistanceRef.current < 5) {
      setSelectedArticle(article);
      if (isMobile) {
        window.location.href = `/article/${article.id}`;
      }
    }
  };

  const handleIndicatorClick = (index: number) => {
    if (scrollContainerRef.current && !scrollingRef.current) {
      scrollingRef.current = true;
      const itemWidth = isMobile ? scrollContainerRef.current.offsetWidth : scrollContainerRef.current.offsetWidth / 6 + 16;
      scrollContainerRef.current.scrollTo({
        left: itemWidth * index,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
      setTimeout(() => {
        scrollingRef.current = false;
      }, 500);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-24" id="blog">
      <div className="max-w-[120rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[clamp(2rem,6vw,4rem)] font-bold text-gray-900 mb-4">
            SIJOER女孩
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-[clamp(1rem,2.5vw,1.25rem)]">
            分享美瞳穿搭经验，展现独特的个人魅力
          </p>
        </div>

        <div className="relative group">
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-hidden cursor-grab active:cursor-grabbing select-none touch-pan-x"
            style={{ 
              scrollBehavior: 'smooth', 
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch'
            }}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {articles.map((article, index) => (
              <div 
                key={`${article.id}-${index}`}
                className={`flex-none bg-white rounded-xl shadow-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  isMobile ? 'w-full' : 'w-[calc((100%-5rem)/6)]'
                }`}
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => handleArticleClick(article)}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={article.image_url} 
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    draggable="false"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-gray-900 font-semibold text-[clamp(0.875rem,1.5vw,1rem)] line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {article.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {!isMobile && (
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-4">
              <button
                onClick={handlePrevious}
                className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white hover:text-indigo-600 transition-all duration-300 transform hover:scale-110 pointer-events-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white hover:text-indigo-600 transition-all duration-300 transform hover:scale-110 pointer-events-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}

          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2">
            {articles.map((_, index) => (
              <button
                key={index}
                onClick={() => handleIndicatorClick(index)}
                className={`transition-all duration-300 focus:outline-none ${
                  currentIndex === index
                    ? 'w-8 h-2 bg-indigo-600'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                } rounded-full`}
                aria-label={`切换到第 ${index + 1} 篇文章`}
              />
            ))}
          </div>

          {!isMobile && (
            <>
              <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
              <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
            </>
          )}
        </div>
      </div>

      {!isMobile && selectedArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedArticle.title}
              </h3>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={selectedArticle.image_url}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <span>{selectedArticle.author}</span>
                <span>·</span>
                <span>{new Date(selectedArticle.created_at).toLocaleDateString()}</span>
              </div>
              
              <div className="text-lg text-gray-600 border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50">
                {selectedArticle.excerpt}
              </div>
              
              <div className="prose max-w-none">
                {selectedArticle.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="text-gray-800 mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}