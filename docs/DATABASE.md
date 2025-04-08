# 数据库结构文档

## 用户账号体系

本系统区分两种用户类型：

### 1. 前台用户账号 (Customer)
- **用途**：网站访客、消费者
- **数据表**：`user_profiles` (关联 `user_view` 表的 `account_type = 'customer'`)
- **相关视图**：`dashboard_users`
- **主要字段**：
  - `id`: 用户唯一标识
  - `display_name`: 显示名称
  - `phone`: 联系电话
  - `avatar_url`: 头像链接
  - `created_at`: 创建时间
  - `updated_at`: 更新时间

### 2. 后台管理账号 (Admin)
- **用途**：系统管理员、内容编辑者
- **数据表**：`user_profiles` (关联 `user_view` 表的 `account_type = 'admin'`)
- **相关视图**：`admin_users`
- **主要字段**：
  - `id`: 用户唯一标识
  - `display_name`: 显示名称
  - `email`: 管理员邮箱
  - `created_at`: 创建时间
  - `updated_at`: 更新时间

## 数据库视图

为了简化查询和解决列名歧义问题，系统创建了以下视图：

### 1. dashboard_orders
- **用途**：数据看板中显示订单概览
- **基础表**：`orders` 和 `user_profiles`
- **特点**：
  - 将 `user_id` 重命名为 `customer_id` 避免歧义
  - 添加了客户名称和电话信息便于显示

### 2. dashboard_users
- **用途**：数据看板中只显示前台用户
- **基础表**：`user_profiles` 和 `user_view`
- **筛选条件**：`account_type = 'customer'`

### 3. admin_users
- **用途**：仅显示后台管理账号
- **基础表**：`user_profiles` 和 `user_view`
- **筛选条件**：`account_type = 'admin'`

## 数据库函数

### calc_total_sales()
- **用途**：计算有效订单总销售额
- **返回类型**：numeric
- **行为**：排除已取消订单的总和

## 最佳实践

1. **视图使用**：
   - 数据看板应使用 `dashboard_orders` 和 `dashboard_users` 视图
   - 系统账号管理应使用 `admin_users` 视图

2. **SQL查询标准**：
   - 查询中始终使用表别名
   - 连接多个表时明确字段来源
   - 对可能引起歧义的列使用具体前缀或AS子句重命名

3. **命名约定**：
   - 主键统一命名为 `id`
   - 外键采用 `<表名单数>_id` 形式
   - 用户关联时避免使用通用的 `user_id`，应使用更具体的字段名 