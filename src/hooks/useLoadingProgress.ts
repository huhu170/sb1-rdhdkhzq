import { useEffect, useRef } from 'react';
import NProgress from 'nprogress';
import { supabase } from '../lib/supabase';

export function useLoadingProgress() {
  const startedRef = useRef(false);

  useEffect(() => {
    // 初始化时启动进度条
    if (!startedRef.current) {
      NProgress.start();
      startedRef.current = true;
    }

    // 监听资源加载事件
    const handleLoadStart = () => {
      if (!NProgress.isStarted()) {
        NProgress.start();
      }
    };

    const handleLoadEnd = () => {
      if (document.readyState === 'complete') {
        setTimeout(() => {
          NProgress.done(true);
        }, 200);
      }
    };

    // DOMContentLoaded 和 load 事件可能已经触发
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleLoadEnd);
      window.addEventListener('load', handleLoadEnd);
    } else {
      // 如果页面已经加载完成，等待一小段时间后完成进度条
      setTimeout(() => {
        NProgress.done(true);
      }, 500);
    }

    // 监听图片和脚本加载
    window.addEventListener('unload', handleLoadStart);
    window.addEventListener('beforeunload', handleLoadStart);

    // 监听所有fetch请求，但添加认证检查
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      // 检查是否是Supabase请求并需要认证
      const url = args[0]?.toString() || '';
      const needsAuth = url.includes('supabase.co') && 
                        (url.includes('/carts') || 
                         url.includes('/cart_items') || 
                         url.includes('/orders') ||
                         url.includes('/user_profiles'));
      
      // 如果是需要认证的请求，检查是否已登录
      if (needsAuth) {
        // 获取当前存储的会话
        const sessionStr = localStorage.getItem('sijoer-auth-session');
        if (!sessionStr) {
          console.warn('拦截未认证API请求:', url);
          // 返回一个空响应而不是实际发送请求
          return Promise.resolve(new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        // 尝试解析会话并检查是否过期
        try {
          const session = JSON.parse(sessionStr);
          const isExpired = new Date(session.expires_at * 1000) <= new Date();
          if (isExpired) {
            console.warn('拦截已过期会话的API请求:', url);
            return Promise.resolve(new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
        } catch (e) {
          console.error('解析会话出错, 拦截请求:', e);
          return Promise.resolve(new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }
      
      NProgress.start();
      return originalFetch.apply(this, args).finally(() => {
        setTimeout(() => NProgress.done(), 300);
      });
    };

    return () => {
      document.removeEventListener('DOMContentLoaded', handleLoadEnd);
      window.removeEventListener('load', handleLoadEnd);
      window.removeEventListener('unload', handleLoadStart);
      window.removeEventListener('beforeunload', handleLoadStart);
      window.fetch = originalFetch;
      NProgress.done();
    };
  }, []);
}

export default useLoadingProgress; 