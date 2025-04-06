import { useEffect } from 'react';
import NProgress from 'nprogress';
import { useLocation } from 'react-router-dom';
import useLoadingProgress from '../hooks/useLoadingProgress';
import 'nprogress/nprogress.css';

// 配置进度条
NProgress.configure({
  minimum: 0.1,
  easing: 'ease',
  speed: 400,
  showSpinner: false,
  trickleSpeed: 200
});

export default function ProgressBar() {
  const location = useLocation();
  
  // 使用全局资源加载进度钩子
  useLoadingProgress();
  
  useEffect(() => {
    // 当路由变化时，开始显示进度条
    NProgress.start();
    
    // 路由变化后，完成进度条
    const timer = setTimeout(() => {
      NProgress.done();
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [location.pathname]);
  
  return null; // 这个组件不渲染任何内容，只是控制进度条
} 