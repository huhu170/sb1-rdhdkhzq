-- Update showcase products images with high-quality portrait photos
UPDATE showcase_products
SET image_url = CASE "order"
  WHEN 1 THEN 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3'
  WHEN 2 THEN 'https://images.unsplash.com/photo-1526045478516-99145907023c?ixlib=rb-4.0.3'
  WHEN 3 THEN 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?ixlib=rb-4.0.3'
  WHEN 4 THEN 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3'
  WHEN 5 THEN 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?ixlib=rb-4.0.3'
  WHEN 6 THEN 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3'
  WHEN 7 THEN 'https://images.unsplash.com/photo-1441123694162-e54a981ceba5?ixlib=rb-4.0.3'
  ELSE image_url
END;

-- Update article images with high-quality portrait photos
UPDATE articles
SET image_url = CASE
  WHEN title LIKE '%美瞳搭配指南%' 
    THEN 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3'
  WHEN title LIKE '%日常妆容%'
    THEN 'https://images.unsplash.com/photo-1526045478516-99145907023c?ixlib=rb-4.0.3'
  WHEN title LIKE '%派对女王%'
    THEN 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?ixlib=rb-4.0.3'
  WHEN title LIKE '%美瞳护理%'
    THEN 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3'
  WHEN title LIKE '%四季美瞳%'
    THEN 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?ixlib=rb-4.0.3'
  WHEN title LIKE '%初学者%'
    THEN 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3'
  WHEN title LIKE '%夏日清爽%'
    THEN 'https://images.unsplash.com/photo-1441123694162-e54a981ceba5?ixlib=rb-4.0.3'
  WHEN title LIKE '%职场必备%'
    THEN 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3'
  WHEN title LIKE '%美瞳颜色搭配%'
    THEN 'https://images.unsplash.com/photo-1512310604669-443f26c35f52?ixlib=rb-4.0.3'
  ELSE image_url
END;

-- Update product images with high-quality portrait photos
UPDATE products
SET image_url = CASE id
  WHEN (SELECT id FROM products WHERE name = '自然系列美瞳' LIMIT 1) 
    THEN 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3'
  WHEN (SELECT id FROM products WHERE name = '魅彩系列美瞳' LIMIT 1)
    THEN 'https://images.unsplash.com/photo-1526045478516-99145907023c?ixlib=rb-4.0.3'
  ELSE image_url
END;