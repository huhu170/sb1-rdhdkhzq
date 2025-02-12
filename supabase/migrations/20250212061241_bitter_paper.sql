-- Update product images with eye-focused images
UPDATE products
SET image_url = CASE id
  WHEN (SELECT id FROM products WHERE name = '自然系列美瞳' LIMIT 1) 
    THEN 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80'
  WHEN (SELECT id FROM products WHERE name = '魅彩系列美瞳' LIMIT 1)
    THEN 'https://images.unsplash.com/photo-1441123694162-e54a981ceba5?auto=format&fit=crop&q=80'
  ELSE image_url
END;

-- Update showcase products images
UPDATE showcase_products
SET image_url = CASE "order"
  WHEN 1 THEN 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80'
  WHEN 2 THEN 'https://images.unsplash.com/photo-1441123694162-e54a981ceba5?auto=format&fit=crop&q=80'
  WHEN 3 THEN 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80'
  WHEN 4 THEN 'https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?auto=format&fit=crop&q=80'
  WHEN 5 THEN 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80'
  WHEN 6 THEN 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80'
  WHEN 7 THEN 'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&q=80'
  ELSE image_url
END;

-- Update article images
UPDATE articles
SET image_url = CASE
  WHEN title LIKE '%美瞳搭配指南%' 
    THEN 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80'
  WHEN title LIKE '%日常妆容%'
    THEN 'https://images.unsplash.com/photo-1441123694162-e54a981ceba5?auto=format&fit=crop&q=80'
  WHEN title LIKE '%派对女王%'
    THEN 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80'
  WHEN title LIKE '%美瞳护理%'
    THEN 'https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?auto=format&fit=crop&q=80'
  WHEN title LIKE '%四季美瞳%'
    THEN 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80'
  WHEN title LIKE '%初学者%'
    THEN 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80'
  WHEN title LIKE '%夏日清爽%'
    THEN 'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&q=80'
  WHEN title LIKE '%职场必备%'
    THEN 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&q=80'
  WHEN title LIKE '%美瞳颜色搭配%'
    THEN 'https://images.unsplash.com/photo-1512310604669-443f26c35f52?auto=format&fit=crop&q=80'
  ELSE image_url
END;