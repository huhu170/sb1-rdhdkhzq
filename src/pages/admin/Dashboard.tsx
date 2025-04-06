import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { PlusCircle, Image, FileText, LogOut, Upload, X, Layout, LayoutDashboard, Images, FileEdit, Eye, Plus, Trash2, Settings, Users, Package, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserList from './users/UserList';
import BannerList from './banners/BannerList';
import ProductList from './products/ProductList';
import SiteSettings from './settings/SiteSettings';
import ArticleList from './articles/ArticleList';
import OrderList from './orders/OrderList';
import OrderDetail from './orders/OrderDetail';

// 定义管理模块
const ADMIN_MODULES = [
  { id: 'articles', name: 'SIJOER女孩管理', icon: FileEdit },
  { id: 'orders', name: '订单管理', icon: ShoppingBag },
  { id: 'users', name: '账号管理', icon: Users },
  { id: 'banners', name: '轮播图管理', icon: Images },
  { id: 'products', name: '产品管理', icon: Layout },
  { id: 'settings', name: '网站设置', icon: Settings }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const [activeModule, setActiveModule] = useState('articles');

  useEffect(() => {
    const path = location.pathname.split('/')[3] || 'articles';
    setActiveModule(path);
  }, [location]);

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
      <div className="w-64 bg-white shadow-sm h-[calc(100vh-4rem)] fixed left-0 top-16">
        <div className="p-4">
          <div className="space-y-2">
            {ADMIN_MODULES.map(module => {
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
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-64 pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="articles" replace />} />
            <Route path="articles" element={<ArticleList />} />
            <Route path="users" element={<UserList />} />
            <Route path="banners" element={<BannerList />} />
            <Route path="products" element={<ProductList />} />
            <Route path="settings" element={<SiteSettings />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/:id" element={<OrderDetail />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}