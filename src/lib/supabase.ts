import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please click the "Connect to Supabase" button in the top right to set up Supabase.');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'sijoer-auth-token'
  },
  global: {
    headers: {
      'x-application-name': 'sijoer'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Enhanced error handler for database operations
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  // Network errors
  if (error.message?.includes('Failed to fetch') || error.code === 'NETWORK_ERROR') {
    return {
      message: '网络连接失败，请检查网络连接并重试',
      code: 'NETWORK_ERROR',
      retryable: true
    };
  }
  
  // Authentication errors
  if (error.status === 401) {
    return {
      message: '登录已过期，请重新登录',
      code: 'AUTH_ERROR',
      retryable: false
    };
  }

  // Rate limiting errors
  if (error.status === 429) {
    return {
      message: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT',
      retryable: true
    };
  }

  // Database errors
  if (error.code?.startsWith('22') || error.code?.startsWith('23')) {
    return {
      message: '数据操作失败，请检查输入是否正确',
      code: 'DATABASE_ERROR',
      retryable: false
    };
  }

  // Default error
  return {
    message: error.message || '操作失败，请稍后重试',
    code: error.code || 'UNKNOWN_ERROR',
    retryable: true
  };
};

// Helper function to check connection
export const checkConnection = async () => {
  try {
    // Use a lightweight query to check connection
    const { data, error } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      // Only log actual errors, not "no rows found"
      if (error.code !== 'PGRST116') {
        console.error('Connection check error:', error);
      }
      return false;
    }

    return true;
  } catch (error) {
    // Only log unexpected errors
    if (error instanceof Error && !error.message.includes('Failed to fetch')) {
      console.error('Connection check failed:', error);
    }
    return false;
  }
};

// Enhanced retry function with exponential backoff
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 5000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Only check connection on retry attempts
      if (attempt > 0) {
        const isConnected = await checkConnection();
        if (!isConnected) {
          await new Promise(resolve => setTimeout(resolve, baseDelay));
          continue;
        }
      }

      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry certain errors
      if (error.status === 401 || error.status === 403) {
        throw handleSupabaseError(error, 'auth check');
      }
      
      if (attempt === maxRetries - 1) {
        throw handleSupabaseError(error, 'max retries reached');
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Helper function to handle auth errors
export const handleAuthError = (error: any) => {
  console.error('Auth error:', error);

  if (error.message?.includes('Failed to fetch') || error.code === 'NETWORK_ERROR') {
    return '网络连接失败，请检查网络连接并重试';
  }

  if (error.message?.includes('Invalid login credentials')) {
    return '邮箱或密码错误';
  }

  if (error.message?.includes('User already registered')) {
    return '该邮箱已被注册';
  }

  if (error.message?.includes('password too short')) {
    return '密码长度至少为6位';
  }

  if (error.message?.includes('invalid email')) {
    return '请输入有效的邮箱地址';
  }

  return error.message || '操作失败，请稍后重试';
};