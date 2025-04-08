import React, { useState } from 'react';

const AdminStorageReset: React.FC = () => {
  const [resetStatus, setResetStatus] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const resetAdminStorage = () => {
    try {
      // 清除所有与管理后台相关的localStorage条目
      localStorage.removeItem('admin-modules-order');
      
      setResetStatus({
        show: true,
        type: 'success',
        message: '管理后台配置已重置，请刷新页面'
      });
      
      // 等待1秒后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('重置管理后台配置失败:', error);
      setResetStatus({
        show: true,
        type: 'error',
        message: '无法重置管理后台配置'
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-red-50 rounded-md border border-red-200 my-4">
      <p className="font-bold text-red-500">管理后台显示异常？</p>
      <p className="text-sm">如果您遇到导航栏显示错误或其他界面问题，可能是由于本地存储的配置损坏。点击下方按钮重置配置。</p>
      <button 
        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded text-sm"
        onClick={resetAdminStorage}
      >
        重置管理后台配置
      </button>
      
      {resetStatus && resetStatus.show && (
        <div className={`mt-2 p-2 rounded ${
          resetStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {resetStatus.message}
        </div>
      )}
    </div>
  );
};

export default AdminStorageReset; 