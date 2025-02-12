-- Update showcase products images with reliable portrait photos
UPDATE showcase_products
SET image_url = CASE "order"
  WHEN 1 THEN 'https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?w=800&auto=format&fit=crop'
  WHEN 2 THEN 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop'
  WHEN 3 THEN 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop'
  WHEN 4 THEN 'https://images.unsplash.com/photo-1526045478516-99145907023c?w=800&auto=format&fit=crop'
  WHEN 5 THEN 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800&auto=format&fit=crop'
  WHEN 6 THEN 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&auto=format&fit=crop'
  WHEN 7 THEN 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop'
  ELSE image_url
END;

-- Update article images with reliable portrait photos
UPDATE articles
SET image_url = CASE
  WHEN title LIKE '%美瞳搭配指南%' 
    THEN 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop'
  WHEN title LIKE '%日常妆容%'
    THEN 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop'
  WHEN title LIKE '%派对女王%'
    THEN 'https://images.unsplash.com/photo-1526045478516-99145907023c?w=800&auto=format&fit=crop'
  WHEN title LIKE '%美瞳护理%'
    THEN 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800&auto=format&fit=crop'
  WHEN title LIKE '%四季美瞳%'
    THEN 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&auto=format&fit=crop'
  WHEN title LIKE '%初学者%'
    THEN 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop'
  WHEN title LIKE '%夏日清爽%'
    THEN 'https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?w=800&auto=format&fit=crop'
  WHEN title LIKE '%职场必备%'
    THEN 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop'
  WHEN title LIKE '%美瞳颜色搭配%'
    THEN 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop'
  ELSE image_url
END;

-- Update product images with reliable portrait photos
UPDATE products
SET image_url = CASE id
  WHEN (SELECT id FROM products WHERE name = '自然系列美瞳' LIMIT 1) 
    THEN 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop'
  WHEN (SELECT id FROM products WHERE name = '魅彩系列美瞳' LIMIT 1)
    THEN 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop'
  ELSE image_url
END;