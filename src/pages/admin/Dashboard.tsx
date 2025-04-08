import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { PlusCircle, Image, FileText, LogOut, Upload, X, Layout, LayoutDashboard, Images, FileEdit, Eye, Plus, Trash2, Settings, Users, Package, ShoppingBag, Glasses, Save, Edit, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserList from './users/UserList';
import { default as AdminUserList } from './users/AdminUserList';
import BannerList from './banners/BannerList';
import ProductList from './products/ProductList';
import SiteSettings from './settings/SiteSettings';
import ArticleList from './articles/ArticleList';
import OrderList from './orders/OrderList';
import OrderDetail from './orders/OrderDetail';
import { default as RGPOKList } from './rgpok/RGPOKList';
import RoleList from './roles/RoleList';
import AdminStorageReset from '../../components/AdminStorageReset';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DropResult } from 'react-beautiful-dnd';
import AdminDashboard from './dashboard/AdminDashboard';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  RemoveRedEye as EyeIcon,
  Public as PublicIcon,
  DevicesOther as DeviceIcon,
  Timer as TimerIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  BarElement
} from 'chart.js';
import { getSeoData, getDailyStats, getRegionStats, getDeviceStats } from '@/lib/seo-utils';
import { SeoData } from '@/lib/seo-utils';

// 注册图表组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// 定义管理模块类型
interface AdminModule {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  order?: number;
}

// 定义管理模块
const DEFAULT_ADMIN_MODULES: AdminModule[] = [
  { id: 'overview', name: '数据看板', icon: LayoutDashboard },
  { id: 'articles', name: 'SIJOER女孩管理', icon: FileEdit },
  { id: 'orders', name: '订单管理', icon: ShoppingBag },
  { id: 'users', name: '用户账号管理', icon: Users },
  { id: 'roles', name: '系统账号管理', icon: Users },
  { id: 'banners', name: '轮播图管理', icon: Images },
  { id: 'products', name: '产品管理', icon: Layout },
  { id: 'rgpok', name: 'RGP & OK镜管理', icon: Glasses },
  { id: 'settings', name: '网站设置', icon: Settings }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user, loading, isSuperAdmin } = useAuth();
  const [activeModule, setActiveModule] = useState('articles');
  const [adminModules, setAdminModules] = useState<AdminModule[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const path = location.pathname.split('/')[3] || 'articles';
    setActiveModule(path);
  }, [location]);

  // 初始化模块，从本地存储加载排序
  useEffect(() => {
    try {
      const savedModulesJson = localStorage.getItem('admin-modules-order');
      if (savedModulesJson) {
        try {
          const savedModules = JSON.parse(savedModulesJson);
          
          // 验证加载的数据是否有效
          if (!Array.isArray(savedModules)) {
            console.error('Invalid saved modules format: not an array');
            localStorage.removeItem('admin-modules-order');
            setAdminModules(DEFAULT_ADMIN_MODULES);
            return;
          }
          
          // 确保所有模块ID都在DEFAULT_ADMIN_MODULES中存在
          const defaultModulesMap = Object.fromEntries(
            DEFAULT_ADMIN_MODULES.map(m => [m.id, m])
          );
          
          // 将保存的模块与默认模块合并
          const processedModules = savedModules
            .filter(module => typeof module === 'object' && module && 'id' in module)
            .map(module => {
              const defaultModule = defaultModulesMap[module.id];
              // 只有在默认模块存在的情况下才使用保存的模块
              if (defaultModule) {
                return {
                  ...defaultModule,  // 使用默认模块的所有属性（包括icon）
                  name: module.name || defaultModule.name, // 保留自定义名称（如果存在）
                };
              }
              return null;
            })
            .filter(Boolean) as AdminModule[];
          
          // 检查是否有缺失的模块（在DEFAULT_ADMIN_MODULES中存在但在保存的模块中不存在）
          const savedModuleIds = new Set(processedModules.map(m => m.id));
          const missingModules = DEFAULT_ADMIN_MODULES.filter(
            m => !savedModuleIds.has(m.id)
          );
          
          // 如果有缺失的模块，添加到已处理的模块列表中
          const finalModules = [...processedModules, ...missingModules];
          
          // 确保有模块可用
          if (finalModules.length === 0) {
            console.error('No valid modules after processing saved data');
            localStorage.removeItem('admin-modules-order');
            setAdminModules(DEFAULT_ADMIN_MODULES);
            return;
          }
          
          console.log('加载管理后台模块:', finalModules.map(m => m.id).join(', '));
          setAdminModules(finalModules);
        } catch (e) {
          console.error('Failed to parse saved admin modules', e);
          localStorage.removeItem('admin-modules-order');
          setAdminModules(DEFAULT_ADMIN_MODULES);
        }
      } else {
        setAdminModules(DEFAULT_ADMIN_MODULES);
      }
    } catch (e) {
      console.error('Error loading admin modules', e);
      setAdminModules(DEFAULT_ADMIN_MODULES);
    }
  }, []);

  // 输出超级管理员状态用于调试
  useEffect(() => {
    console.log('==== 管理后台状态 ====');
    console.log('超级管理员状态:', isSuperAdmin);
    console.log('当前用户:', user?.email);
    console.log('是否为超级管理员邮箱:', user?.email === 'admin@sijoer.com');
    console.log('=====================');
    
    // 强制立即显示编辑按钮，如果用户是超级管理员
    if (user?.email === 'admin@sijoer.com' && !isSuperAdmin) {
      console.log('Dashboard: 用户是admin@sijoer.com但isSuperAdmin为false，可能有问题');
    }
  }, [isSuperAdmin, user]);

  // 检查超级管理员状态或直接基于email判断
  const isActuallySuperAdmin = user?.email === 'admin@sijoer.com' || isSuperAdmin;

  // Check authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(adminModules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setAdminModules(items);
  };

  const saveModuleOrder = () => {
    try {
      // 只保存ID和名称
      const safeModules = adminModules.map(module => ({
        id: module.id,
        name: module.name
      }));
      
      localStorage.setItem('admin-modules-order', JSON.stringify(safeModules));
      console.log('已保存管理后台模块排序:', safeModules.map(m => m.id).join(', '));
      setIsEditMode(false);
    } catch (e) {
      console.error('Failed to save module order', e);
      alert('保存排序失败，请重试');
    }
  };

  const resetModuleOrder = () => {
    setAdminModules(DEFAULT_ADMIN_MODULES);
    localStorage.removeItem('admin-modules-order');
    setIsEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">希乔尔管理后台</h1>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-700 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5 mr-2" />
              退出登录
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto">
        <div className="p-4">
          {/* 超级管理员的导航编辑按钮 */}
          {isActuallySuperAdmin && (
            <div className="mb-4 flex items-center justify-between">
              {isEditMode ? (
                <>
                  <button
                    onClick={saveModuleOrder}
                    className="flex items-center text-sm text-green-600 hover:text-green-800"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    保存排序
                  </button>
                  <button
                    onClick={resetModuleOrder}
                    className="flex items-center text-sm text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4 mr-1" />
                    取消
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 py-1 px-2 rounded-md border border-indigo-200 hover:bg-indigo-50"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  编辑导航顺序
                </button>
              )}
            </div>
          )}
          
          {/* 导航项列表 */}
          {isEditMode && isActuallySuperAdmin ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="modules">
                {(provided: DroppableProvided) => (
                  <div 
                    className="space-y-2" 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {adminModules.map((module, index) => {
                      const Icon = module.icon;
                      return (
                        <Draggable 
                          key={module.id} 
                          draggableId={module.id} 
                          index={index}
                        >
                          {(provided: DraggableProvided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`w-full flex items-center px-4 py-2 rounded-md text-sm bg-white border border-dashed border-gray-300 group hover:border-indigo-300 ${
                                activeModule === module.id
                                  ? 'text-indigo-600 bg-indigo-50 border-indigo-200 border-solid'
                                  : 'text-gray-600'
                              }`}
                            >
                              <Icon className="w-5 h-5 mr-3" />
                              {module.name}
                              <span className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </span>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="space-y-2">
              {adminModules.map(module => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.id}
                    to={`/admin/dashboard/${module.id}`}
                    className={`w-full flex items-center px-4 py-2 rounded-md text-sm ${
                      activeModule === module.id
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {module.name}
                  </Link>
                );
              })}
            </div>
          )}
          
          {/* 添加重置配置组件 */}
          <div className="mt-8">
            <AdminStorageReset />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-64 pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="overview" replace />} />
            <Route path="overview" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <AdminDashboard />
              </React.Suspense>
            } />
            <Route path="articles" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <ArticleList />
              </React.Suspense>
            } />
            <Route path="orders" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <OrderList />
              </React.Suspense>
            } />
            <Route path="orders/:id" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <OrderDetail />
              </React.Suspense>
            } />
            <Route path="users" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <UserList />
              </React.Suspense>
            } />
            <Route path="roles" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <RoleList />
              </React.Suspense>
            } />
            <Route path="banners" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <BannerList />
              </React.Suspense>
            } />
            <Route path="products" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <ProductList />
              </React.Suspense>
            } />
            <Route path="rgpok" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <RGPOKList />
              </React.Suspense>
            } />
            <Route path="settings" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
                <SiteSettings />
              </React.Suspense>
            } />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}