import React, { useEffect, useState } from 'react';
import { Eye, ChevronDown, ShoppingCart, User } from 'lucide-react';
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

  const defaultNavItems: NavItem[] = [];

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

  const fetchSettings = async () => {
    try {
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('site_settings')
          .select('*')
          .single();
      });

      if (error) throw error;
      if (data) setSettings(data);
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching settings');
      console.error('Error fetching settings:', handledError);
      // Don't show error to user for nav settings
    }
  };

  const fetchCartItemCount = async () => {
    if (!session?.user.id) return;

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
      }
    } catch (err: any) {
      const handledError = handleSupabaseError(err, 'fetching cart items');
      console.error('Error fetching cart items:', handledError);
      // Don't show error to user for cart count
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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
            {/* 只在已加载且登录后才显示导航菜单 */}
            {isLoading ? (
              // 加载状态时显示占位符
              <div className="w-8 h-6"></div>
            ) : session && (settings?.nav_items || defaultNavItems).map((item) => (
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

          {/* Mobile Navigation Button - 只在登录后显示 */}
          {isLoading ? (
            // 加载中时显示空白占位符
            <div className="md:hidden w-6 h-6"></div>
          ) : session ? (
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
          ) : (
            <Link
              to="/auth/login"
              className={`md:hidden transition font-medium ${
                isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white hover:text-white/90 drop-shadow-md'
              }`}
            >
              登录/注册
            </Link>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && session && (
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
              
              {/* Mobile User Menu */}
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
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}