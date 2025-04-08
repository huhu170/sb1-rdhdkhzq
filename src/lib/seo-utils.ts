/**
 * SEO数据工具函数
 * 
 * 此模块为数据看板提供SEO数据获取和处理功能
 */

// SEO数据接口定义
export interface SeoData {
  pageViews: number;
  uniqueVisitors: number;
  topKeywords: { keyword: string, count: number }[];
  regionData: { region: string, count: number }[];
  deviceData: { device: string, count: number }[];
  bounceRate: number;
  avgSessionDuration: number;
  topPages: { path: string, views: number }[];
  referrers: { source: string, count: number }[];
  weekdayDistribution: { day: string, count: number }[];
}

/**
 * 获取SEO数据
 * 注意：当前为模拟数据，实际生产中应对接真实分析服务
 */
export function getSeoData(): SeoData {
  // 从localStorage获取基本访问计数
  const viewCount = parseInt(localStorage.getItem('site_view_count') || '0') || 23567;
  
  // 模拟其他SEO数据
  const mockSeoData: SeoData = {
    pageViews: viewCount,
    uniqueVisitors: Math.round(viewCount * 0.7), // 假设70%是唯一访客
    topKeywords: [
      {keyword: "美瞳", count: 1342},
      {keyword: "RGP镜片", count: 985},
      {keyword: "隐形眼镜", count: 872},
      {keyword: "OK镜", count: 763},
      {keyword: "彩色美瞳", count: 648},
      {keyword: "角膜塑形镜", count: 522},
      {keyword: "近视矫正", count: 478},
      {keyword: "日抛美瞳", count: 395},
      {keyword: "散光镜片", count: 325},
      {keyword: "RGP适应", count: 287}
    ],
    regionData: [
      {region: "广东省", count: 3825},
      {region: "上海市", count: 3421},
      {region: "北京市", count: 2987},
      {region: "浙江省", count: 2543},
      {region: "江苏省", count: 2187},
      {region: "四川省", count: 1654},
      {region: "福建省", count: 1465},
      {region: "山东省", count: 1322},
      {region: "湖北省", count: 1176},
      {region: "其他地区", count: 2987}
    ],
    deviceData: [
      {device: "手机", count: 15673},
      {device: "平板", count: 3452},
      {device: "桌面电脑", count: 4128},
      {device: "其他设备", count: 314}
    ],
    bounceRate: 42.7,
    avgSessionDuration: 186, // 平均会话时长(秒)
    topPages: [
      {path: "/products/rgp", views: 3245},
      {path: "/products/cosmetic", views: 2875},
      {path: "/products/ok-lens", views: 2654},
      {path: "/blog/choose-right-lens", views: 1987},
      {path: "/products/daily-disposable", views: 1654}
    ],
    referrers: [
      {source: "百度搜索", count: 7845},
      {source: "微信", count: 4532},
      {source: "小红书", count: 3254},
      {source: "直接访问", count: 3125},
      {source: "其他来源", count: 4811}
    ],
    weekdayDistribution: [
      {day: "周一", count: 3254},
      {day: "周二", count: 3125},
      {day: "周三", count: 3476},
      {day: "周四", count: 3287},
      {day: "周五", count: 3521},
      {day: "周六", count: 4287},
      {day: "周日", count: 4198}
    ]
  };
  
  // 记录当天的访问数据
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = JSON.parse(localStorage.getItem('daily_views') || '{}');
  
  if (!dailyStats[today]) {
    dailyStats[today] = 1;
  } else {
    dailyStats[today]++;
  }
  
  localStorage.setItem('daily_views', JSON.stringify(dailyStats));
  localStorage.setItem('site_view_count', (viewCount + 1).toString());
  
  return mockSeoData;
}

/**
 * 记录页面访问
 * 在用户浏览页面时调用此函数记录访问数据
 */
export function recordPageVisit(path: string = window.location.pathname) {
  const visitRecord = {
    path,
    timestamp: new Date().toISOString(),
    referrer: document.referrer || 'direct',
    userAgent: navigator.userAgent
  };
  
  // 获取现有记录
  const existingRecords = JSON.parse(localStorage.getItem('page_visits') || '[]');
  
  // 添加新记录（保持最近100条）
  existingRecords.push(visitRecord);
  if (existingRecords.length > 100) {
    existingRecords.shift();
  }
  
  // 保存回localStorage
  localStorage.setItem('page_visits', JSON.stringify(existingRecords));
  
  // 更新总访问量
  const viewCount = parseInt(localStorage.getItem('site_view_count') || '0');
  localStorage.setItem('site_view_count', (viewCount + 1).toString());
}

/**
 * 获取每日访问统计数据
 * 返回最近30天的访问量趋势
 */
export function getDailyStats(): { date: string, count: number }[] {
  const dailyStats = JSON.parse(localStorage.getItem('daily_views') || '{}');
  const result: { date: string, count: number }[] = [];
  
  // 获取最近30天日期
  const today = new Date();
  
  // 生成基础随机数据
  const baseValues = [];
  for (let i = 0; i < 30; i++) {
    // 周末流量更高
    const date = new Date(today);
    date.setDate(today.getDate() - 29 + i);
    const dayOfWeek = date.getDay(); // 0 是周日, 6 是周六
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // 基础值 500-700 之间
    let baseValue = 500 + Math.floor(Math.random() * 200);
    
    // 周末增加 30-40%
    if (isWeekend) {
      baseValue = Math.floor(baseValue * (1.3 + Math.random() * 0.1));
    }
    
    // 近期增长趋势 (最近几天流量更高)
    const recentTrendFactor = 1 + (i / 30) * 0.5;
    
    baseValues.push(Math.floor(baseValue * recentTrendFactor));
  }
  
  // 平滑处理，每个值受前后值影响
  const smoothedValues = [];
  for (let i = 0; i < baseValues.length; i++) {
    let value = baseValues[i];
    
    // 如果不是第一个和最后一个值，受前后值的影响
    if (i > 0 && i < baseValues.length - 1) {
      value = Math.floor(
        (baseValues[i-1] * 0.25) +
        (value * 0.5) +
        (baseValues[i+1] * 0.25)
      );
    }
    
    smoothedValues.push(value);
  }
  
  // 生成最终结果
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - 29 + i);
    const dateString = date.toISOString().split('T')[0];
    
    // 使用存储数据或平滑的模拟数据
    const count = dailyStats[dateString] || smoothedValues[i];
    
    result.push({
      date: dateString,
      count
    });
  }
  
  return result;
}

/**
 * 模拟存储搜索关键词
 * 在实际项目中，这应该连接到实际的搜索服务
 */
export function recordSearchKeyword(keyword: string) {
  if (!keyword.trim()) return;
  
  const keywords = JSON.parse(localStorage.getItem('search_keywords') || '[]');
  keywords.push({
    keyword: keyword.trim().toLowerCase(),
    timestamp: new Date().toISOString()
  });
  
  // 限制存储数量
  if (keywords.length > 1000) {
    keywords.shift();
  }
  
  localStorage.setItem('search_keywords', JSON.stringify(keywords));
}

/**
 * 获取访问IP地区分布
 * 返回各地区的访问量统计
 */
export function getRegionStats(): { region: string, count: number, percentage: number }[] {
  // 在实际项目中，这应该从数据库或分析服务中获取
  // 这里使用模拟数据
  const regions = [
    { region: "广东省", count: 3825 },
    { region: "上海市", count: 3421 },
    { region: "北京市", count: 2987 },
    { region: "浙江省", count: 2543 },
    { region: "江苏省", count: 2187 },
    { region: "四川省", count: 1654 },
    { region: "福建省", count: 1465 },
    { region: "山东省", count: 1322 },
    { region: "湖北省", count: 1176 },
    { region: "其他地区", count: 2987 }
  ];
  
  // 计算总访问量
  const totalCount = regions.reduce((sum, item) => sum + item.count, 0);
  
  // 计算百分比
  return regions.map(item => ({
    ...item,
    percentage: parseFloat(((item.count / totalCount) * 100).toFixed(1))
  }));
}

/**
 * 获取访问设备分布
 * 返回各类设备的访问量统计
 */
export function getDeviceStats(): { device: string, count: number, percentage: number }[] {
  // 在实际项目中，这应该从数据库或分析服务中获取
  const devices = [
    { device: "手机", count: 15673 },
    { device: "平板", count: 3452 },
    { device: "桌面电脑", count: 4128 },
    { device: "其他设备", count: 314 }
  ];
  
  // 计算总访问量
  const totalCount = devices.reduce((sum, item) => sum + item.count, 0);
  
  // 计算百分比
  return devices.map(item => ({
    ...item,
    percentage: parseFloat(((item.count / totalCount) * 100).toFixed(1))
  }));
}

/**
 * 清除所有SEO相关数据
 * 仅用于测试目的
 */
export function clearAllSeoData() {
  localStorage.removeItem('site_view_count');
  localStorage.removeItem('daily_views');
  localStorage.removeItem('page_visits');
  localStorage.removeItem('search_keywords');
} 