import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link, 
  // 导入未来标志功能
  UNSAFE_DataRouterContext, 
  UNSAFE_DataRouterStateContext,
  createRoutesFromChildren,
  matchRoutes
} from 'react-router-dom';
// 导入并配置React Router的未来标志
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProgressBar from './components/ProgressBar';
import { supabase } from './lib/supabase';

// 使用懒加载优化组件加载
const Hero = lazy(() => import('./components/Hero'));
const CustomizationTool = lazy(() => import('./components/CustomizationTool'));
const Gallery = lazy(() => import('./components/Gallery'));
const Blog = lazy(() => import('./components/Blog'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Cart = lazy(() => import('./pages/cart/Cart'));
const Checkout = lazy(() => import('./pages/checkout/Checkout'));
const Payment = lazy(() => import('./pages/payment/Payment'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const Orders = lazy(() => import('./pages/profile/Orders'));
const Customize = lazy(() => import('./pages/customize/Customize'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const TrackingPage = lazy(() => import('./pages/tracking/TrackingPage'));
const RGPOKPage = lazy(() => import('./pages/rgpok/RGPOKPage'));

// 加载组件
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

// 简单的错误显示组件
const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="py-16 bg-gray-50 text-center">
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <p className="text-red-600 mb-2">❌ 加载错误</p>
      <p className="text-gray-700">{message}</p>
    </div>
  </div>
);

// 首页组件 - 优化加载逻辑
const HomePage = () => {
  // 跟踪整体加载状态
  const [showLoader, setShowLoader] = useState(true);
  
  // 各组件的加载状态
  const [componentsState, setComponentsState] = useState({
    hero: { loaded: false, error: false },
    tool: { loaded: false, error: false },
    gallery: { loaded: false, error: false },
    blog: { loaded: false, error: false }
  });

  // 在组件加载后立即开始计时
  useEffect(() => {
    // 页面3秒后无论如何结束加载状态
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // 处理各组件加载完成
  const setComponentLoaded = (component: 'hero' | 'tool' | 'gallery' | 'blog') => {
    setComponentsState(prev => ({
      ...prev,
      [component]: { ...prev[component], loaded: true }
    }));
  };

  // 处理各组件加载错误
  const setComponentError = (component: 'hero' | 'tool' | 'gallery' | 'blog') => {
    setComponentsState(prev => ({
      ...prev,
      [component]: { ...prev[component], error: true, loaded: true }
    }));
  };

  // 在组件渲染时自动标记加载状态
  useEffect(() => {
    // 为每个组件设置加载完成的定时器
    const heroTimer = setTimeout(() => setComponentLoaded('hero'), 100);
    const toolTimer = setTimeout(() => setComponentLoaded('tool'), 200);
    const galleryTimer = setTimeout(() => setComponentLoaded('gallery'), 300);
    const blogTimer = setTimeout(() => setComponentLoaded('blog'), 400);
    
    // 清理定时器
    return () => {
      clearTimeout(heroTimer);
      clearTimeout(toolTimer);
      clearTimeout(galleryTimer);
      clearTimeout(blogTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero组件 */}
        <div 
          style={{ 
            opacity: componentsState.hero.loaded ? 1 : 0, 
            transition: 'opacity 0.5s' 
          }}
        >
          <Suspense fallback={<div className="h-96" />}>
            {componentsState.hero.error ? (
              <ErrorDisplay message="Hero组件加载失败" />
            ) : (
              <Hero />
            )}
          </Suspense>
        </div>
        
        {/* CustomizationTool组件 */}
        <div 
          style={{ 
            opacity: componentsState.tool.loaded ? 1 : 0, 
            transition: 'opacity 0.5s' 
          }}
        >
          <Suspense 
            fallback={<div className="h-96" />}
          >
            {componentsState.tool.error ? (
              <ErrorDisplay message="定制工具组件加载失败" />
            ) : (
              <CustomizationTool />
            )}
          </Suspense>
        </div>
        
        {/* Gallery组件 */}
        <div 
          style={{ 
            opacity: componentsState.gallery.loaded ? 1 : 0, 
            transition: 'opacity 0.5s' 
          }}
        >
          <Suspense 
            fallback={<div className="h-96" />}
          >
            {componentsState.gallery.error ? (
              <ErrorDisplay message="画廊组件加载失败" />
            ) : (
              <Gallery />
            )}
          </Suspense>
        </div>
        
        {/* Blog组件 */}
        <div 
          style={{ 
            opacity: componentsState.blog.loaded ? 1 : 0, 
            transition: 'opacity 0.5s' 
          }}
        >
          <Suspense 
            fallback={<div className="h-96" />}
          >
            {componentsState.blog.error ? (
              <ErrorDisplay message="博客组件加载失败" />
            ) : (
              <Blog />
            )}
          </Suspense>
        </div>
        
        {/* 加载指示器 */}
        {showLoader && (
          <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    // 在加载过程中，显示全屏加载状态，避免跳转到登录页
    return <LoadingFallback />;
  }

  // 仅在完全确认未登录时才重定向
  if (!session) {
    return <Navigate to="/auth/login" state={{ from: window.location.pathname }} replace />;
  }

  return <>{children}</>;
};

// 添加前台路由保护组件，阻止管理员访问前台
const FrontendRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  
  // 只需检查AuthContext中的isAdmin状态
  useEffect(() => {
    if (!loading && session) {
      setIsCheckingRole(true);
      
      // 使用setTimeout避免立即重定向导致的页面闪烁
      setTimeout(() => {
        if (isAdmin) {
          console.log('管理员账号不能访问前台，重定向到管理后台');
          navigate('/admin/dashboard', { replace: true });
        }
        setIsCheckingRole(false);
      }, 100);
    } else {
      setIsCheckingRole(false);
    }
  }, [session, loading, isAdmin, navigate]);

  if (loading || isCheckingRole) {
    return <LoadingFallback />;
  }

  // 如果是管理员账号,返回null让重定向发生
  if (isAdmin) {
    return null;
  }

  // 不是管理员账号,正常渲染前台内容
  return <>{children}</>;
};

function AppRoutes() {
  // 创建路由器并配置未来标志
  const router = createBrowserRouter(
    [
      {
        path: "/",
        element: <FrontendRoute><HomePage /></FrontendRoute>,
      },
      {
        path: "/admin",
        children: [
          {
            path: "login",
            element: <Login />
          },
          {
            path: "dashboard/*",
            element: <ProtectedRoute><Dashboard /></ProtectedRoute>
          }
        ]
      },
      {
        path: "/auth",
        children: [
          {
            path: "login",
            element: <Login />
          },
          {
            path: "register",
            element: <Register />
          }
        ]
      },
      {
        path: "/cart",
        element: <ProtectedRoute><FrontendRoute><Cart /></FrontendRoute></ProtectedRoute>
      },
      {
        path: "/checkout",
        element: <ProtectedRoute><Navbar /><Checkout /><Footer /></ProtectedRoute>
      },
      {
        path: "/payment/:id",
        element: <ProtectedRoute><Navbar /><Payment /><Footer /></ProtectedRoute>
      },
      {
        path: "/profile",
        element: <ProtectedRoute><div className="min-h-screen"><Navbar /><FrontendRoute><Profile /></FrontendRoute><Footer /></div></ProtectedRoute>
      },
      {
        path: "/orders",
        element: <ProtectedRoute><Navbar /><Orders /><Footer /></ProtectedRoute>
      },
      {
        path: "/products",
        element: <><Navbar /><ProductList /><Footer /></>
      },
      {
        path: "/customize",
        element: <><Navbar /><Customize /><Footer /></>
      },
      {
        path: "/rgpok",
        element: <FrontendRoute><RGPOKPage /></FrontendRoute>
      },
      {
        path: "/tracking",
        element: <><Navbar /><TrackingPage /><Footer /></>
      },
      {
        path: "/tracking/:order_id",
        element: <><Navbar /><TrackingPage /><Footer /></>
      },
      {
        path: "*",
        element: <FrontendRoute>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-900">404</h1>
              <p className="text-2xl text-gray-600 mt-4">页面不存在</p>
              <Link to="/" className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">
                返回首页
              </Link>
            </div>
          </div>
        </FrontendRoute>
      }
    ],
    {
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true
      } as any
    }
  );

  return (
    <>
      {/* 进度条组件 */}
      <ProgressBar />
      <Suspense fallback={<LoadingFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </>
  );
}

// 主App组件使用AuthProvider包装整个应用
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

// 错误边界组件，用于捕获子组件渲染错误
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("组件渲染错误:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default App;