-- 更新散光度数的配置
UPDATE customization_options
SET 
  min = 0,
  max = 500,
  step = 25,
  unit = '度',
  name = '散光度数'
WHERE name = '散光度数' AND "group" = '视力矫正';

-- 更新产品定制范围中的散光度数配置
UPDATE product_customization_ranges pcr
SET 
  min_value = 0,
  max_value = 500,
  step_value = 25
FROM customization_options co
WHERE 
  pcr.parameter_id = co.id 
  AND co.name = '散光度数' 
  AND co.group = '视力矫正'; 