import { useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

export default function ProgressBar() {
  useEffect(() => {
    // 配置NProgress
    NProgress.configure({ 
      minimum: 0.1,  // 显示的最小百分比
      trickleSpeed: 200,  // 速度更快
      showSpinner: false,  // 不显示旋转器，减少DOM操作
      easing: 'ease',  // 使用简单的缓动函数
      speed: 300,  // 过渡速度更快
    });

    // 启动进度条
    NProgress.start();

    // 监听路由变化和资源加载
    const handleStart = () => {
      NProgress.start();
    };

    const handleDone = () => {
      NProgress.done();
    };

    // 为资源加载添加事件监听 - 移动端只监听关键事件
    window.addEventListener('load', handleDone);
    
    // 只在非移动设备上添加额外的事件监听
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    // 保存原始方法的引用，确保在组件卸载时可以正确恢复
    const originalFetch = window.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    
    if (!isMobile) {
      window.addEventListener('beforeunload', handleStart);
      
      // 劫持fetch以显示加载状态 - 但优化为只处理长时间运行的请求
      window.fetch = async function(...args) {
        // 创建一个标志，表示请求是否已完成
        let requestDone = false;
        
        // 使用超时来决定是否显示加载指示器
        // 只有请求超过300ms的才会显示加载状态，避免短请求闪烁
        setTimeout(() => {
          if (!requestDone) {
            handleStart();
          }
        }, 300);
        
        try {
          const response = await originalFetch.apply(window, args);
          requestDone = true;
          handleDone();
          return response;
        } catch (error) {
          requestDone = true;
          handleDone();
          throw error;
        }
      };

      // 劫持XHR以显示加载状态 - 同样优化
      // @ts-ignore - 忽略类型错误，实现功能更重要
      XMLHttpRequest.prototype.open = function(...args) {
        let requestStarted = false;
        
        this.addEventListener('loadstart', () => {
          // 同样使用延迟，避免短请求导致闪烁
          setTimeout(() => {
            if (!this.onloadend && requestStarted) {
              handleStart();
            }
          }, 300);
          requestStarted = true;
        });
        
        this.addEventListener('loadend', handleDone);
        // @ts-ignore
        originalOpen.apply(this, args);
      };
    }

    // 确保页面完全加载后进度条完成
    if (document.readyState === 'complete') {
      // 给一个短延迟，确保UI正常渲染
      setTimeout(() => {
        handleDone();
      }, 500);
    }

    // 组件卸载时清理
    return () => {
      // 清理所有事件监听和拦截
      window.removeEventListener('load', handleDone);
      
      if (!isMobile) {
        window.removeEventListener('beforeunload', handleStart);
        
        // 恢复原始方法
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalOpen;
      }
      
      NProgress.done();
    };
  }, []);

  return null;
} 