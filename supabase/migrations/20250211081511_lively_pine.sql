/*
  # Admin System Tables

  1. New Tables
    - `roles` - 用户角色表
      - `id` (uuid, primary key)
      - `name` (text) - 角色名称
      - `description` (text) - 角色描述
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `permissions` - 权限表
      - `id` (uuid, primary key)
      - `code` (text) - 权限代码
      - `name` (text) - 权限名称
      - `description` (text) - 权限描述
      - `module` (text) - 所属模块
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `role_permissions` - 角色权限关联表
      - `role_id` (uuid, foreign key)
      - `permission_id` (uuid, foreign key)
      - `created_at` (timestamptz)

    - `user_roles` - 用户角色关联表
      - `user_id` (uuid, foreign key)
      - `role_id` (uuid, foreign key)
      - `created_at` (timestamptz)

    - `audit_logs` - 操作日志表
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `action` (text) - 操作类型
      - `module` (text) - 操作模块
      - `details` (jsonb) - 操作详情
      - `ip_address` (text) - IP地址
      - `created_at` (timestamptz)

    - `components` - 组件表
      - `id` (uuid, primary key)
      - `name` (text) - 组件名称
      - `description` (text) - 组件描述
      - `type` (text) - 组件类型
      - `config` (jsonb) - 组件配置
      - `status` (text) - 组件状态
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    - Set up audit logging triggers
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  module text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create components table
CREATE TABLE IF NOT EXISTS components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  config jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'draft'))
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access to roles"
  ON roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to permissions"
  ON permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to role_permissions"
  ON role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to user_roles"
  ON user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to audit_logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to components"
  ON components FOR SELECT TO authenticated USING (true);

-- Create admin policies
CREATE POLICY "Allow admin full access to roles"
  ON roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Repeat similar admin policies for other tables...

-- Create audit log function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, module, details)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    jsonb_build_object(
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
      'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all tables
CREATE TRIGGER audit_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON permissions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_components_changes
  AFTER INSERT OR UPDATE OR DELETE ON components
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Insert default roles and permissions
INSERT INTO roles (name, description) VALUES
  ('admin', '系统管理员'),
  ('editor', '内容编辑'),
  ('viewer', '只读用户')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, name, description, module) VALUES
  ('components.view', '查看组件', '允许查看组件列表和详情', 'components'),
  ('components.create', '创建组件', '允许创建新组件', 'components'),
  ('components.edit', '编辑组件', '允许编辑现有组件', 'components'),
  ('components.delete', '删除组件', '允许删除组件', 'components'),
  ('components.publish', '发布组件', '允许发布或取消发布组件', 'components'),
  ('audit.view', '查看审计日志', '允许查看系统审计日志', 'audit'),
  ('users.manage', '用户管理', '允许管理用户账号', 'users'),
  ('roles.manage', '角色管理', '允许管理角色和权限', 'roles')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'editor'
  AND p.code IN ('components.view', 'components.create', 'components.edit')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer'
  AND p.code IN ('components.view')
ON CONFLICT DO NOTHING;

-- Assign admin role to the default admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'admin@sijoer.com'
  AND r.name = 'admin'
ON CONFLICT DO NOTHING;