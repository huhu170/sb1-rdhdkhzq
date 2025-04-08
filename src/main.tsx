import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 移除StrictMode以避免开发中的双重渲染，提高性能
createRoot(document.getElementById('root')!).render(
  <App />
);
