import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CustomizationTool from './components/CustomizationTool';
import Gallery from './components/Gallery';
import Blog from './components/Blog';
import Footer from './components/Footer';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/admin/Dashboard';
import Cart from './pages/cart/Cart';
import Checkout from './pages/checkout/Checkout';
import Payment from './pages/payment/Payment';
import Profile from './pages/profile/Profile';
import Orders from './pages/profile/Orders';
import Customize from './pages/customize/Customize';
import ProductList from './pages/products/ProductList';
import ProgressBar from './components/ProgressBar';
import TrackingPage from './pages/tracking/TrackingPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    // 在加载过程中，显示全屏加载状态，避免跳转到登录页
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 仅在完全确认未登录时才重定向
  if (!session) {
    return <Navigate to="/auth/login" state={{ from: window.location.pathname }} replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Router>
      {/* 进度条组件 */}
      <ProgressBar />
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin">
          <Route path="login" element={<Login />} />
          <Route
            path="dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Auth Routes */}
        <Route path="/auth">
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        {/* Cart Route */}
        <Route
          path="/cart"
          element={
            <>
              <Navbar />
              <Cart />
              <Footer />
            </>
          }
        />

        {/* Checkout Route */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Navbar />
              <Checkout />
              <Footer />
            </ProtectedRoute>
          }
        />

        {/* Payment Route */}
        <Route
          path="/payment/:id"
          element={
            <ProtectedRoute>
              <Navbar />
              <Payment />
              <Footer />
            </ProtectedRoute>
          }
        />

        {/* Profile Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navbar />
              <Profile />
              <Footer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Navbar />
              <Orders />
              <Footer />
            </ProtectedRoute>
          }
        />

        {/* Products Route */}
        <Route
          path="/products"
          element={
            <>
              <Navbar />
              <ProductList />
              <Footer />
            </>
          }
        />

        {/* Customize Route */}
        <Route
          path="/customize"
          element={
            <>
              <Navbar />
              <Customize />
              <Footer />
            </>
          }
        />
        
        {/* Public Routes */}
        <Route path="/" element={
          <div className="min-h-screen bg-white">
            <Navbar />
            <main>
              <Hero />
              <CustomizationTool />
              <Gallery />
              <Blog />
            </main>
            <Footer />
          </div>
        } />

        {/* 跟踪页面 */}
        <Route
          path="/tracking"
          element={
            <>
              <Navbar />
              <TrackingPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/tracking/:order_id"
          element={
            <>
              <Navbar />
              <TrackingPage />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
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

export default App;