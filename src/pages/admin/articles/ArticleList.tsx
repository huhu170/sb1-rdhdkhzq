import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Search } from 'lucide-react';
import ArticleForm from './ArticleForm';
import ArticlePreview from './ArticlePreview';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchArticles();
  }, [currentPage]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('articles')
        .select('*', { count: 'exact' });

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setArticles(data || []);
      if (count) {
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
    } catch (err: any) {
      console.error('Error fetching articles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchArticles();
    } catch (err: any) {
      console.error('Error deleting article:', err);
      setError(err.message);
    }
  };

  const handleStatusToggle = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ is_active: !article.is_active })
        .eq('id', article.id);

      if (error) throw error;
      
      await fetchArticles();
    } catch (err: any) {
      console.error('Error updating article status:', err);
      setError(err.message);
    }
  };

  const handlePreview = (article: Article) => {
    setSelectedArticle(article);
    setShowPreview(true);
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">文章管理</h2>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 sm:min-w-[300px]">
              <input
                type="text"
                placeholder="搜索文章..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <button
              onClick={() => {
                setSelectedArticle(null);
                setShowForm(true);
              }}
              className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 whitespace-nowrap"
            >
              <Plus className="w-5 h-5 mr-2" />
              新建文章
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* 文章列表 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start p-4 gap-4">
              {/* 封面图 */}
              <div 
                className="w-48 h-32 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => handlePreview(article)}
              >
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>

              {/* 文章信息 */}
              <div className="flex-1 min-w-0">
                <div 
                  className="text-lg font-medium text-gray-900 hover:text-indigo-600 cursor-pointer mb-2"
                  onClick={() => handlePreview(article)}
                >
                  {article.title}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {article.excerpt}
                </p>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span>{article.author}</span>
                  <span>·</span>
                  <span>{new Date(article.created_at).toLocaleString()}</span>
                  <button
                    onClick={() => handleStatusToggle(article)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      article.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {article.is_active ? '已发布' : '草稿'}
                  </button>
                </div>
              </div>

              {/* 操作按钮 - 悬浮显示 */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setSelectedArticle(article);
                    setShowForm(true);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-900"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="text-sm text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between rounded-lg shadow-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                显示第 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> 到{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredArticles.length)}
                </span>{' '}
                条，共{' '}
                <span className="font-medium">{filteredArticles.length}</span> 条记录
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  上一页
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === i + 1
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  下一页
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ArticleForm
          article={selectedArticle}
          onClose={() => {
            setShowForm(false);
            setSelectedArticle(null);
          }}
          onSuccess={() => {
            fetchArticles();
            setShowForm(false);
            setSelectedArticle(null);
          }}
        />
      )}

      {showPreview && selectedArticle && (
        <ArticlePreview
          article={selectedArticle}
          onClose={() => {
            setShowPreview(false);
            setSelectedArticle(null);
          }}
        />
      )}
    </div>
  );
}