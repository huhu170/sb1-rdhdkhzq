/*
  # Add sample articles data

  1. Changes
    - Insert sample articles data for the blog section
*/

-- Insert sample articles if none exist
INSERT INTO articles (title, excerpt, content, author, image_url, is_active)
SELECT
  '美瞳搭配指南：打造完美眼妆',
  '探索如何选择适合你的美瞳颜色和款式，让你的眼妆更加出彩',
  '选择合适的美瞳是打造完美妆容的关键。本文将为你详细介绍如何根据肤色、瞳色和场合选择最适合的美瞳，以及如何搭配眼妆，让你的眼神更具魅力。',
  'Sarah',
  'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80',
  true
WHERE NOT EXISTS (SELECT 1 FROM articles LIMIT 1);

INSERT INTO articles (title, excerpt, content, author, image_url, is_active)
SELECT
  '日常妆容必备：自然系美瞳推荐',
  '为你推荐适合日常佩戴的自然系美瞳，打造清新淡雅的妆容效果',
  '想要打造日常自然妆容，选择合适的美瞳至关重要。本文精选多款适合日常佩戴的自然系美瞳，从浅棕到深棕，总有一款适合你。',
  'Emily',
  'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=895&q=80',
  true
WHERE NOT EXISTS (SELECT 2 FROM articles LIMIT 1);

INSERT INTO articles (title, excerpt, content, author, image_url, is_active)
SELECT
  '派对女王：闪耀美瞳选购指南',
  '为重要场合选择合适的美瞳，让你成为派对焦点',
  '特别场合需要特别的妆容。本文将介绍多款适合派对场合的闪耀美瞳，让你的眼妆更具吸引力，成为派对的焦点。',
  'Jessica',
  'https://images.unsplash.com/photo-1596704017234-0e70f8c6506b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80',
  true
WHERE NOT EXISTS (SELECT 3 FROM articles LIMIT 1);

INSERT INTO articles (title, excerpt, content, author, image_url, is_active)
SELECT
  '美瞳护理全攻略',
  '正确的美瞳护理方法，让你的美瞳使用更安全、更持久',
  '美瞳的正确护理对眼睛健康至关重要。本文将详细介绍美瞳的清洁、保存方法，以及使用注意事项，帮助你安全地使用美瞳。',
  'Linda',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80',
  true
WHERE NOT EXISTS (SELECT 4 FROM articles LIMIT 1);

INSERT INTO articles (title, excerpt, content, author, image_url, is_active)
SELECT
  '四季美瞳搭配指南',
  '随着季节变换选择合适的美瞳颜色，打造应季妆容',
  '不同季节适合不同风格的美瞳。春季可以选择明亮的棕色系，夏季适合清爽的灰色系，秋季可以尝试深邃的棕色系，冬季则可以选择神秘的紫色系。',
  'Sophie',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=887&q=80',
  true
WHERE NOT EXISTS (SELECT 5 FROM articles LIMIT 1);

INSERT INTO articles (title, excerpt, content, author, image_url, is_active)
SELECT
  '初学者美瞳使用指南',
  '第一次使用美瞳？这些技巧和注意事项你必须知道',
  '对于第一次使用美瞳的朋友，本文将为你详细介绍美瞳的选购要点、戴取方法、清洁保养等实用技巧，让你安心使用美瞳。',
  'Amy',
  'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80',
  true
WHERE NOT EXISTS (SELECT 6 FROM articles LIMIT 1);