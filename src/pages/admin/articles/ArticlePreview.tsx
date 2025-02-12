import React from 'react';
import { X } from 'lucide-react';

interface ArticlePreviewProps {
  article: {
    title: string;
    excerpt: string;
    content: string;
    author: string;
    image_url: string;
    created_at: string;
  };
  onClose: () => void;
}

export default function ArticlePreview({ article, onClose }: ArticlePreviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">文章预览</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 封面图 */}
          <div className="aspect-[16/9] rounded-lg overflow-hidden">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* 标题和作者信息 */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{article.title}</h1>
            <div className="flex items-center text-sm text-gray-500">
              <span>{article.author}</span>
              <span className="mx-2">·</span>
              <span>{new Date(article.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* 摘要 */}
          <div className="text-lg text-gray-600 border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50">
            {article.excerpt}
          </div>

          {/* 内容 */}
          <div className="prose max-w-none">
            {article.content.split('\n').map((paragraph, index) => (
              <p key={index} className="text-gray-800 mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* 关闭按钮 */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
}