-- 更新近视度数的配置
UPDATE customization_options
SET 
  min = 0,
  max = 1500,
  step = 25,
  unit = '度',
  name = '近视度数'
WHERE name = '近视度数' AND "group" = '视力矫正';

-- 更新产品定制范围中的近视度数配置
UPDATE product_customization_ranges pcr
SET 
  min_value = 0,
  max_value = 1500,
  step_value = 25
FROM customization_options co
WHERE 
  pcr.parameter_id = co.id 
  AND co.name = '近视度数' 
  AND co.group = '视力矫正'; 