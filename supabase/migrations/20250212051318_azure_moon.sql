/*
  # Add vision correction parameters

  1. New Options
    - 近视度数 (Myopia): -12.00D to 0.00D
    - 远视度数 (Hyperopia): 0.00D to +8.00D
    - 散光度数 (Astigmatism): 0.00D to -6.00D
    - 散光轴向 (Axis): 0° to 180°
    - 基弧 (Base Curve): 8.4mm, 8.6mm, 8.8mm

  2. Changes
    - Add new customization options for vision correction
    - Set appropriate ranges and step values
    - Group parameters logically
*/

INSERT INTO customization_options (
  id,
  name,
  type,
  options,
  min,
  max,
  step,
  unit,
  required,
  default_value,
  price_adjustment,
  "group",
  "order"
) VALUES
  (
    gen_random_uuid(),
    '近视度数',
    'number',
    NULL,
    -12.00,
    0.00,
    0.25,
    'D',
    false,
    '0',
    0,
    '视力矫正',
    4
  ),
  (
    gen_random_uuid(),
    '远视度数',
    'number',
    NULL,
    0.00,
    8.00,
    0.25,
    'D',
    false,
    '0',
    0,
    '视力矫正',
    5
  ),
  (
    gen_random_uuid(),
    '散光度数',
    'number',
    NULL,
    -6.00,
    0.00,
    0.25,
    'D',
    false,
    '0',
    0,
    '视力矫正',
    6
  ),
  (
    gen_random_uuid(),
    '散光轴向',
    'number',
    NULL,
    0,
    180,
    1,
    '°',
    false,
    '0',
    0,
    '视力矫正',
    7
  ),
  (
    gen_random_uuid(),
    '基弧',
    'select',
    '[
      {"value": "8.4", "label": "8.4mm", "price_adjustment": 0},
      {"value": "8.6", "label": "8.6mm", "price_adjustment": 0},
      {"value": "8.8", "label": "8.8mm", "price_adjustment": 0}
    ]',
    NULL,
    NULL,
    NULL,
    'mm',
    true,
    '8.6',
    0,
    '视力矫正',
    8
  )
ON CONFLICT DO NOTHING;