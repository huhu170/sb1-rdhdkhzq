import React, { useEffect, useState, useRef, TouchEvent } from 'react';
import { supabase, handleSupabaseError, retryOperation } from '../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
}

export default function Gallery() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();
  
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
    fetchProducts();
    checkMobile();
    startAutoScroll();
    
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
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

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('showcase_products')
          .select('*')
          .eq('is_active', true)
          .order('order');
      });
      
      if (error) throw error;
      if (data) {
        setProducts(data);
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching products');
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
      if (scrollContainerRef.current && !isDraggingRef.current && !scrollingRef.current && !isHovering) {
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
    const itemWidth = isMobile ? container.offsetWidth : container.offsetWidth / 4 + 24;
    let newIndex = currentIndex - 1;
    
    if (newIndex < 0) {
      newIndex = products.length - 1;
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
    const itemWidth = isMobile ? container.offsetWidth : container.offsetWidth / 4 + 24;
    let newIndex = currentIndex + 1;
    
    if (newIndex >= products.length) {
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
        const itemWidth = isMobile ? scrollContainerRef.current.offsetWidth : scrollContainerRef.current.offsetWidth / 4 + 24;
        const newIndex = Math.round(scrollContainerRef.current.scrollLeft / itemWidth);
        setCurrentIndex(newIndex);
        scrollContainerRef.current.scrollTo({
          left: itemWidth * newIndex,
          behavior: 'smooth'
        });
      }
    }
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
        const itemWidth = isMobile ? container.offsetWidth : container.offsetWidth / 4 + 24;
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
        const itemWidth = isMobile ? scrollContainerRef.current.offsetWidth : scrollContainerRef.current.offsetWidth / 4 + 24;
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

  const handleProductClick = (product: Product) => {
    if (dragDistanceRef.current < 5) {
      // 导航到定制页面
      navigate('/customize', { 
        state: { 
          selectedProduct: product 
        }
      });
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
    <div className="bg-white py-24" id="gallery">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[clamp(1.5rem,5vw,3rem)] font-bold text-gray-900 mb-4">
            产品系列
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-[clamp(0.875rem,2vw,1rem)]">
            探索希乔尔精选系列产品，为您的眼睛带来舒适与美丽
          </p>
        </div>

        <div className="relative group">
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-hidden cursor-grab active:cursor-grabbing select-none touch-pan-x"
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
            {products.map((product, index) => (
              <div 
                key={`${product.id}-${index}`}
                className={`flex-none bg-white rounded-xl shadow-lg overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  isMobile ? 'w-full' : 'w-[calc((100%-72px)/4)]'
                }`}
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => handleProductClick(product)}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    draggable="false"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 space-y-1">
                    <h3 className="text-white font-semibold text-lg line-clamp-2 group-hover:text-indigo-200 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-white/80 text-sm line-clamp-1">
                      ¥{product.price}
                    </p>
                  </div>
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
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (scrollContainerRef.current && !scrollingRef.current) {
                    scrollingRef.current = true;
                    const itemWidth = isMobile ? scrollContainerRef.current.offsetWidth : scrollContainerRef.current.offsetWidth / 4 + 24;
                    scrollContainerRef.current.scrollTo({
                      left: itemWidth * index,
                      behavior: 'smooth'
                    });
                    setCurrentIndex(index);
                    setTimeout(() => {
                      scrollingRef.current = false;
                    }, 500);
                  }
                }}
                className={`transition-all duration-300 focus:outline-none ${
                  currentIndex === index
                    ? 'w-8 h-2 bg-indigo-600'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                } rounded-full`}
                aria-label={`切换到第 ${index + 1} 个产品`}
              />
            ))}
          </div>

          {!isMobile && (
            <>
              <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none" />
              <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}