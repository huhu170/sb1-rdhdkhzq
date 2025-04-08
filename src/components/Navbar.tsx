import React, { useEffect, useState, useCallback } from 'react';
import { Eye, ChevronDown, ShoppingCart, User, Glasses } from 'lucide-react';
import { supabase, handleSupabaseError, retryOperation } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SubNavItem {
  id: string;
  label: string;
  href: string;
  parentId?: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  subItems?: SubNavItem[];
}

interface SiteSettings {
  id: string;
  logo_url: string;
  nav_font_family: string;
  nav_font_size: string;
  nav_items: NavItem[];
}

export default function Navbar() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  const defaultNavItems: NavItem[] = [
    {
      id: 'rgpok',
      label: 'RGP & OK镜',
      href: '/rgpok',
      subItems: []
    }
  ];

  useEffect(() => {
    fetchSettings();
    
    // Add scroll listener
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Set loading state based on auth loading
    setIsLoading(loading);
    
    // Fetch cart items only when auth is loaded and user is logged in
    if (!loading && session) {
      fetchCartItemCount();
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [session, loading]);

  useEffect(() => {
    if (session?.user) {
      fetchCartItemCount();
    } else {
      setCartItemCount(0);
    }

    // 添加购物车更新事件监听
    const handleCartUpdated = () => {
      console.log('购物车已更新，重新获取购物车数量');
      fetchCartItemCount();
    };

    window.addEventListener('cart-updated', handleCartUpdated);

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated);
    };
  }, [session]);

  const fetchSettings = async () => {
    // 尝试从本地缓存加载设置
    const cachedSettings = localStorage.getItem('sijoer-site-settings');
    if (cachedSettings) {
      try {
        const parsedSettings = JSON.parse(cachedSettings);
        const cacheTime = localStorage.getItem('sijoer-settings-timestamp');
        
        // 检查缓存是否在24小时内
        if (cacheTime && (Date.now() - parseInt(cacheTime)) < 24 * 60 * 60 * 1000) {
          console.log('从缓存加载网站设置');
          
          // 确保RGP&OK镜入口始终存在
          const rgpokExists = parsedSettings.nav_items.some((item: NavItem) => item.href === '/rgpok');
          if (!rgpokExists) {
            parsedSettings.nav_items.push({
              id: 'rgpok',
              label: 'RGP & OK镜',
              href: '/rgpok',
              subItems: []
            });
          }
          
          setSettings(parsedSettings);
          return;
        }
      } catch (e) {
        console.error('解析缓存设置出错:', e);
      }
    }
    
    try {
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('site_settings')
          .select('*')
          .single();
      });

      if (error) throw error;
      if (data) {
        // 确保RGP&OK镜入口始终存在
        const rgpokExists = data.nav_items.some((item: NavItem) => item.href === '/rgpok');
        if (!rgpokExists) {
          // 如果服务器返回的导航项中没有RGP&OK镜入口，则添加它
          data.nav_items.push({
            id: 'rgpok',
            label: 'RGP & OK镜',
            href: '/rgpok',
            subItems: []
          });
        }
        setSettings(data);
        
        // 缓存设置
        localStorage.setItem('sijoer-site-settings', JSON.stringify(data));
        localStorage.setItem('sijoer-settings-timestamp', Date.now().toString());
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching settings');
      console.error('Error fetching settings:', handledError);
      // Don't show error to user for nav settings
    }
  };

  const fetchCartItemCount = useCallback(async () => {
    if (!session?.user.id) return;
    
    // 尝试从缓存获取购物车数量
    const cachedCount = localStorage.getItem('sijoer-cart-count');
    const cacheTime = localStorage.getItem('sijoer-cart-timestamp');
    
    if (cachedCount && cacheTime) {
      try {
        // 缓存不超过5分钟有效
        if ((Date.now() - parseInt(cacheTime)) < 5 * 60 * 1000) {
          console.log('从缓存获取购物车数量');
          setCartItemCount(parseInt(cachedCount));
          return;
        }
      } catch (e) {
        console.error('解析缓存购物车数量出错:', e);
      }
    }

    try {
      // First, try to get the user's cart with retry
      const { data: cartData } = await retryOperation(async () => {
        return await supabase
          .from('carts')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();
      });

      if (cartData) {
        // Get cart items count with retry
        const { data: items, error: itemsError } = await retryOperation(async () => {
          return await supabase
            .from('cart_items')
            .select('quantity')
            .eq('cart_id', cartData.id);
        });

        if (itemsError) throw itemsError;

        const count = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        setCartItemCount(count);
        
        // 缓存购物车数量
        localStorage.setItem('sijoer-cart-count', count.toString());
        localStorage.setItem('sijoer-cart-timestamp', Date.now().toString());
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching cart items');
      console.error('Error fetching cart items:', handledError);
      // Don't show error to user for cart count
    }
  }, [session]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // 清除本地存储的会话，但不要清除其他有用的缓存数据
      localStorage.removeItem('sijoer-auth-session');
      
      // 使用navigate代替window.location.href，保留React状态
      navigate('/');
    } catch (err: any) {
      console.error('Error signing out:', err);
    }
  };

  const navStyle = {
    fontFamily: settings?.nav_font_family || 'system-ui',
    fontSize: settings?.nav_font_size || '1rem'
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-black/30 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="SIJOER" className="h-8 w-auto mr-2" />
              ) : (
                <Eye className={`h-8 w-8 ${isScrolled ? 'text-indigo-600' : 'text-white drop-shadow-md'}`} />
              )}
              <span className={`text-xl font-bold ${isScrolled ? 'text-gray-900' : 'text-white drop-shadow-md'}`}>
                SIJOER
              </span>
              <span className={`text-xl ml-1 ${isScrolled ? 'text-gray-600' : 'text-white drop-shadow-md'}`}>
                希乔尔
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8" style={navStyle}>
            {/* 显示导航菜单项(对所有用户可见) */}
            {isLoading ? (
              // 加载状态时显示占位符
              <div className="w-8 h-6"></div>
            ) : (settings?.nav_items || defaultNavItems).map((item) => (
              <div
                key={item.id}
                className="relative group"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  to={item.href}
                  className={`flex items-center transition font-medium ${
                    isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white hover:text-white drop-shadow-md'
                  }`}
                >
                  {item.label}
                  {item.subItems && item.subItems.length > 0 && (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Link>
                
                {/* Submenu */}
                {item.subItems && item.subItems.length > 0 && hoveredItem === item.id && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.id}
                        to={subItem.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isLoading ? (
                // 加载中时显示空白占位符
                <div className="w-6 h-6"></div>
              ) : session ? (
                <>
                  <Link
                    to="/cart"
                    className={`relative transition ${
                      isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white hover:text-white/90 drop-shadow-md'
                    }`}
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                  <div className="relative group">
                    <button
                      className={`flex items-center transition ${
                        isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white hover:text-white/90 drop-shadow-md'
                      }`}
                      onClick={() => setHoveredItem(hoveredItem === 'user' ? null : 'user')}
                    >
                      <User className="w-6 h-6" />
                    </button>
                    {hoveredItem === 'user' && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                        >
                          个人中心
                        </Link>
                        <Link
                          to="/orders"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                        >
                          我的订单
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                        >
                          退出登录
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link
                  to="/auth/login"
                  className={`transition font-medium ${
                    isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white hover:text-white/90 drop-shadow-md'
                  }`}
                >
                  登录/注册
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Navigation Button */}
          {isLoading ? (
            // 加载中时显示空白占位符
            <div className="md:hidden w-6 h-6"></div>
          ) : (
            <button
              className={`md:hidden p-2 rounded-md transition ${
                isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white hover:text-white/90 drop-shadow-md'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 bg-white" style={navStyle}>
            <div className="flex flex-col space-y-4">
              {(settings?.nav_items || defaultNavItems).map((item) => (
                <div key={item.id} className="space-y-2">
                  <Link
                    to={item.href}
                    className="block text-gray-700 hover:text-indigo-600 transition px-4 py-2 rounded-md hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.subItems && item.subItems.length > 0 && (
                    <div className="pl-8 space-y-2">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.id}
                          to={subItem.href}
                          className="block text-sm text-gray-600 hover:text-indigo-600 transition px-4 py-2 rounded-md hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* 仅对登录用户显示的项目 */}
              {session && (
                <>
                  <Link
                    to="/cart"
                    className="flex items-center text-gray-700 hover:text-indigo-600 transition px-4 py-2 rounded-md hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    购物车
                    {cartItemCount > 0 && (
                      <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full px-2 py-1">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center text-gray-700 hover:text-indigo-600 transition px-4 py-2 rounded-md hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-5 h-5 mr-2" />
                    个人中心
                  </Link>
                  <Link
                    to="/orders"
                    className="block text-gray-700 hover:text-indigo-600 transition px-4 py-2 rounded-md hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    我的订单
                  </Link>
                  <button
                    onClick={async () => {
                      await handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left text-gray-700 hover:text-indigo-600 transition px-4 py-2 rounded-md hover:bg-gray-100"
                  >
                    退出登录
                  </button>
                </>
              )}
              
              {/* 未登录用户显示登录链接 */}
              {!session && (
                <Link
                  to="/auth/login"
                  className="flex items-center text-gray-700 hover:text-indigo-600 transition px-4 py-2 rounded-md hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5 mr-2" />
                  登录/注册
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}