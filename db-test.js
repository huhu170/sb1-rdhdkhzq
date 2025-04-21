import { createClient } from '@supabase/supabase-js';

// 从环境变量中读取配置
const supabaseUrl = 'https://gfohxoizcxhivbzbislk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmb2h4b2l6Y3hoaXZiemJpc2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyNDU1MTIsImV4cCI6MjA1NDgyMTUxMn0.531n7HCzGlqAhjjv8uFd3qQuHJwVkrZReBnxOdYUIDY';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  db: {
    schema: 'public'
  }
});

async function testDatabaseConnection() {
  try {
    console.log('开始测试数据库连接...');
    
    // 1. 测试基本连接
    const { data: settingsData, error: settingsError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);

    if (settingsError) {
      throw new Error(`数据库查询错误: ${settingsError.message}`);
    }

    console.log('✅ 基本连接测试通过');
    console.log('查询结果:', settingsData);

    // 2. 测试认证状态
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      throw new Error(`认证检查错误: ${authError.message}`);
    }

    console.log('✅ 认证系统正常');
    console.log('当前认证状态:', session ? '已登录' : '未登录');

    // 3. 测试数据库权限
    const { data: testData, error: testError } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1);

    if (testError) {
      if (testError.code === 'PGRST301') {
        console.log('⚠️ 需要认证才能访问此表');
      } else {
        throw new Error(`权限测试错误: ${testError.message}`);
      }
    } else {
      console.log('✅ 数据库权限测试通过');
    }

    console.log('\n🎉 所有测试完成！数据库连接正常工作。');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误信息:', error);
  }
}

// 运行测试
testDatabaseConnection(); 