// check-schema.js
// 检查数据库表结构
import { createClient } from '@supabase/supabase-js';

async function checkSchema() {
  console.log('检查数据库表结构...');
  
  // 创建 Supabase 客户端
  const supabaseUrl = 'https://gfohxoizcxhivbzbislk.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmb2h4b2l6Y3hoaXZiemJpc2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyNDU1MTIsImV4cCI6MjA1NDgyMTUxMn0.531n7HCzGlqAhjjv8uFd3qQuHJwVkrZReBnxOdYUIDY';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // 检查products表结构
    const { data, error } = await supabase
      .rpc('get_products_schema');
    
    if (error) {
      throw error;
    }
    
    console.log('Products表结构:', data);
    
    // 查询products表的第一条记录，看看实际结构
    const { data: sampleProduct, error: sampleError } = await supabase
      .from('products')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError && sampleError.code !== 'PGRST116') {
      throw sampleError;
    }
    
    if (sampleProduct) {
      console.log('样例产品结构:', sampleProduct);
      console.log('可用字段:', Object.keys(sampleProduct).join(', '));
    } else {
      console.log('没有找到任何产品');
    }
    
  } catch (err) {
    console.error('检查表结构时发生错误:', err);
    
    // 尝试使用普通方式查询数据
    try {
      console.log('使用常规方式查询产品...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log('产品表结构:', Object.keys(data[0]).join(', '));
      } else {
        console.log('产品表为空');
      }
    } catch (queryErr) {
      console.error('常规查询也失败了:', queryErr);
    }
  }
}

// 执行检查
checkSchema(); 