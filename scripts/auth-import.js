// auth-import.js
// 先进行身份验证再导入产品数据
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// 隐形眼镜产品数据
const contactLensProducts = [
  {
    name: "水润舒适日抛",
    description: "高透氧硅水凝胶材质，全天候舒适体验，适合日常使用，42%含水量",
    base_price: 128,
    image_url: "https://images.unsplash.com/photo-1609902669725-1f5d9655bdab?auto=format&fit=crop&q=80"
  },
  {
    name: "星空灰美瞳",
    description: "创新星空图案设计，打造深邃眼神，独特的灰色调，让眼神更加迷人",
    base_price: 149,
    image_url: "https://images.unsplash.com/photo-1634137716456-c393087e14e7?auto=format&fit=crop&q=80"
  },
  {
    name: "棕色自然系列",
    description: "自然棕色调，融合瞳孔原始颜色，打造自然融合的眼神层次感",
    base_price: 139,
    image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80"
  },
  {
    name: "蓝宝石精灵",
    description: "梦幻蓝色调，如蓝宝石般闪耀，含有光感颜料，在不同光线下呈现多变效果",
    base_price: 159,
    image_url: "https://images.unsplash.com/photo-1576439728268-6039e8652111?auto=format&fit=crop&q=80"
  },
  {
    name: "高清透明月抛",
    description: "极致透明，几乎无色差，适合想要放大眼睛但保持原有眼睛颜色的用户",
    base_price: 119,
    image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80"
  },
  {
    name: "紫色魅影",
    description: "神秘紫色调，微妙的光泽变化，打造梦幻眼妆效果，适合特殊场合使用",
    base_price: 169,
    image_url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80"
  },
  {
    name: "敏感肌专用日抛",
    description: "特殊配方，减少眼部刺激，适合敏感眼部和干眼症患者，含保湿因子",
    base_price: 148,
    image_url: "https://images.unsplash.com/photo-1579201113458-29330a9874ed?auto=format&fit=crop&q=80"
  },
  {
    name: "翡翠绿美瞳",
    description: "如翡翠般的绿色调，自然纹理，提亮眼部，适合多种肤色",
    base_price: 145,
    image_url: "https://images.unsplash.com/photo-1605393401129-7baa6ff6fbec?auto=format&fit=crop&q=80"
  },
  {
    name: "商务黑月抛",
    description: "淡雅黑色调，低调精致，适合商务场合，带来专业稳重的形象",
    base_price: 135,
    image_url: "https://images.unsplash.com/photo-1512291313931-d4281f1d071c?auto=format&fit=crop&q=80"
  },
  {
    name: "混血棕美瞳",
    description: "融合东西方眼部特点，创造自然混血效果，提亮瞳色，增大眼睛视觉效果",
    base_price: 155,
    image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80"
  },
  {
    name: "高氧透气月抛",
    description: "超高透氧性材质，长时间佩戴也舒适，适合需要长时间佩戴的用户",
    base_price: 165,
    image_url: "https://images.unsplash.com/photo-1531750026848-8ada78f641c2?auto=format&fit=crop&q=80"
  },
  {
    name: "樱花粉季抛",
    description: "柔和粉色调，如樱花般浪漫，适合春夏季节使用，打造甜美气质",
    base_price: 158,
    image_url: "https://images.unsplash.com/photo-1612531822315-68304d8e1469?auto=format&fit=crop&q=80"
  },
  {
    name: "水晶透明年抛",
    description: "优质材质，透明清晰，价格经济实惠，适合追求性价比的用户",
    base_price: 199,
    image_url: "https://images.unsplash.com/photo-1584251501883-f085ba8a3d90?auto=format&fit=crop&q=80"
  },
  {
    name: "蜜糖棕日抛",
    description: "温暖蜜糖色调，提亮肤色，适合日常使用，打造自然好气色",
    base_price: 129,
    image_url: "https://images.unsplash.com/photo-1564923634888-c68d02fe4cfd?auto=format&fit=crop&q=80"
  },
  {
    name: "海洋蓝月抛",
    description: "如深海般的蓝色调，层次分明，打造深邃神秘的眼神",
    base_price: 145,
    image_url: "https://images.unsplash.com/photo-1600598834226-fb53a7f2c3f0?auto=format&fit=crop&q=80"
  },
  {
    name: "蜜桃粉美瞳",
    description: "少女感十足的蜜桃粉色调，提亮眼部，打造可爱甜美的眼妆效果",
    base_price: 149,
    image_url: "https://images.unsplash.com/photo-1535575745973-3cbfa2c46c84?auto=format&fit=crop&q=80"
  },
  {
    name: "优质硅水凝胶月抛",
    description: "采用先进的硅水凝胶技术，全天候保持湿润，超高透氧性，佩戴舒适",
    base_price: 185,
    image_url: "https://images.unsplash.com/photo-1609902726285-00668009f004?auto=format&fit=crop&q=80"
  },
  {
    name: "钻石闪月抛",
    description: "含有微量闪粉，在灯光下呈现钻石般的闪耀效果，适合派对、演出等场合",
    base_price: 175,
    image_url: "https://images.unsplash.com/photo-1629011023759-c53a1eeff9f3?auto=format&fit=crop&q=80"
  },
  {
    name: "阳光橙美瞳",
    description: "明亮的橙色调，如阳光般温暖，提亮肤色，增添活力",
    base_price: 155,
    image_url: "https://images.unsplash.com/photo-1596634580139-102e69020a41?auto=format&fit=crop&q=80"
  },
  {
    name: "玫瑰金混血",
    description: "独特的玫瑰金色调，创新混血效果，既有气质又有个性",
    base_price: 169,
    image_url: "https://images.unsplash.com/photo-1568739253582-afa48fbcea47?auto=format&fit=crop&q=80"
  }
];

// 创建命令行输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 读取输入
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 主函数
async function main() {
  // 创建 Supabase 客户端
  const supabaseUrl = 'https://gfohxoizcxhivbzbislk.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmb2h4b2l6Y3hoaXZiemJpc2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyNDU1MTIsImV4cCI6MjA1NDgyMTUxMn0.531n7HCzGlqAhjjv8uFd3qQuHJwVkrZReBnxOdYUIDY';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // 登录管理员账号
    console.log('登录管理员账户...');
    console.log('使用默认测试帐号 - admin@sijoer.com / sijoer2024');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@sijoer.com',
      password: 'sijoer2024'
    });
    
    if (authError) {
      throw authError;
    }
    
    console.log('登录成功!');
    console.log('用户信息: ', authData.user.email);
    
    // 清空产品表
    console.log('清空产品表...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (deleteError) {
      throw deleteError;
    }
    
    // 添加产品
    console.log(`正在添加 ${contactLensProducts.length} 条产品数据...`);
    
    const { data, error } = await supabase
      .from('products')
      .insert(contactLensProducts)
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log(`成功添加 ${data.length} 条产品数据!`);
    
    // 登出
    await supabase.auth.signOut();
    console.log('已登出');
    
  } catch (err) {
    console.error('操作出错:', err);
  } finally {
    rl.close();
  }
}

// 执行主函数
main(); 