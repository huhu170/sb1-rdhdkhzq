-- Update product images
UPDATE products
SET image_url = CASE id
  WHEN (SELECT id FROM products WHERE name = '自然系列美瞳' LIMIT 1) 
    THEN 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80'
  WHEN (SELECT id FROM products WHERE name = '魅彩系列美瞳' LIMIT 1)
    THEN 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80'
  ELSE image_url
END;

-- Update showcase products images
UPDATE showcase_products
SET image_url = CASE "order"
  WHEN 1 THEN 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80'
  WHEN 2 THEN 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80'
  WHEN 3 THEN 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80'
  WHEN 4 THEN 'https://images.unsplash.com/photo-1588516903720-8ceb67f9ef84?auto=format&fit=crop&q=80'
  WHEN 5 THEN 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&q=80'
  WHEN 6 THEN 'https://images.unsplash.com/photo-1596704017234-0e70f8c6506b?auto=format&fit=crop&q=80'
  WHEN 7 THEN 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80'
  ELSE image_url
END;

-- Update article images
UPDATE articles
SET image_url = CASE
  WHEN title LIKE '%美瞳搭配指南%' 
    THEN 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80'
  WHEN title LIKE '%日常妆容%'
    THEN 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80'
  WHEN title LIKE '%派对女王%'
    THEN 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80'
  WHEN title LIKE '%美瞳护理%'
    THEN 'https://images.unsplash.com/photo-1588516903720-8ceb67f9ef84?auto=format&fit=crop&q=80'
  WHEN title LIKE '%四季美瞳%'
    THEN 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&q=80'
  WHEN title LIKE '%初学者%'
    THEN 'https://images.unsplash.com/photo-1596704017234-0e70f8c6506b?auto=format&fit=crop&q=80'
  WHEN title LIKE '%夏日清爽%'
    THEN 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80'
  WHEN title LIKE '%职场必备%'
    THEN 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&q=80'
  WHEN title LIKE '%美瞳颜色搭配%'
    THEN 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?auto=format&fit=crop&q=80'
  ELSE image_url
END;