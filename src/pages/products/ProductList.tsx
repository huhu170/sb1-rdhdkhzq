import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Search, Grid, List, SlidersHorizontal, Star, StarHalf, 
  ChevronDown, ShoppingCart, ArrowUpDown, TrendingUp, ThumbsUp
} from 'lucide-react';
import { debounce } from 'lodash';

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  sale_price?: number;
  image_url: string;
  rating: number;
  review_count: number;
  tags: string[];
}

interface FilterState {
  priceRange: [number, number];
  rating: number | null;
  tags: string[];
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'popularity';
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000],
    rating: null,
    tags: [],
    sortBy: 'popularity'
  });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      fetchProducts(term);
    }, 300),
    []
  );

  useEffect(() => {
    fetchProducts();
  }, [filters]); // Re-fetch when filters change

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const fetchProducts = async (search = '') => {
    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*');

      // Apply search filter
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      // Apply price range filter
      query = query
        .gte('base_price', filters.priceRange[0])
        .lte('base_price', filters.priceRange[1]);

      // Apply rating filter
      if (filters.rating) {
        query = query.gte('rating', filters.rating);
      }

      // Apply tag filters
      if (filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'price_asc':
          query = query.order('base_price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('base_price', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'popularity':
          query = query.order('review_count', { ascending: false });
          break;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setProducts(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    // Add to cart logic here
  };

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarHalf key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <div className={`group bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg ${
      viewMode === 'grid' ? 'h-full' : 'flex'
    }`}>
      <div className={`relative overflow-hidden ${
        viewMode === 'grid' ? 'aspect-square' : 'w-48 flex-shrink-0'
      }`}>
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {product.tags?.map((tag, index) => (
          <span
            key={tag}
            className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded-full"
            style={{ transform: `translateY(${index * 28}px)` }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className={`p-4 flex flex-col ${viewMode === 'list' ? 'flex-1' : ''}`}>
        <h3 className="text-lg font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600">
          {product.name}
        </h3>
        
        <div className="mt-auto space-y-2">
          <div className="flex items-center">
            <div className="flex items-center">
              {renderRatingStars(product.rating)}
            </div>
            <span className="ml-2 text-sm text-gray-500">
              ({product.review_count})
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-indigo-600">
              ¥{product.sale_price || product.base_price}
            </span>
            {product.sale_price && (
              <span className="text-sm text-gray-500 line-through">
                ¥{product.base_price}
              </span>
            )}
          </div>

          <button
            onClick={() => handleAddToCart(product.id)}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            加入购物车
          </button>
        </div>
      </div>

      {/* Hover Description */}
      <div className="absolute inset-0 bg-black/75 text-white p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <h4 className="font-medium mb-2">{product.name}</h4>
        <p className="text-sm text-gray-200">{product.description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex-1 min-w-[300px] relative">
            <input
              type="text"
              placeholder="搜索产品..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 text-gray-700 hover:text-indigo-600"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              筛选
            </button>
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-indigo-600'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-indigo-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="popularity">按热度排序</option>
              <option value="price_asc">价格从低到高</option>
              <option value="price_desc">价格从高到低</option>
              <option value="rating">评分最高</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`w-64 flex-shrink-0 transition-all duration-300 ${
            showFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}>
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 sticky top-24">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">价格区间</h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={filters.priceRange[0]}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceRange: [parseInt(e.target.value), prev.priceRange[1]] }))}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={filters.priceRange[1]}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceRange: [prev.priceRange[0], parseInt(e.target.value)] }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>¥{filters.priceRange[0]}</span>
                    <span>¥{filters.priceRange[1]}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">评分</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFilters(prev => ({ ...prev, rating: rating === filters.rating ? null : rating }))}
                      className={`flex items-center w-full px-2 py-1 rounded ${
                        filters.rating === rating ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        {renderRatingStars(rating)}
                      </div>
                      <span className="ml-2">及以上</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">标签</h3>
                <div className="space-y-2">
                  {['热销', '限时', '新品', '促销'].map((tag) => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.tags.includes(tag)}
                        onChange={(e) => {
                          setFilters(prev => ({
                            ...prev,
                            tags: e.target.checked
                              ? [...prev.tags, tag]
                              : prev.tags.filter(t => t !== tag)
                          }));
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-gray-700">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {error && (
              <div className="mb-6 bg-red-50 text-red-500 p-4 rounded-md">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : products.length > 0 ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无商品</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}