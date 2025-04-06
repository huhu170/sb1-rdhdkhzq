import { useEffect, useRef } from 'react';
import NProgress from 'nprogress';

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

    // 监听所有fetch请求
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
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