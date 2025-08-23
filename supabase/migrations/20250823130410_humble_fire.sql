/*
  # إنشاء نظام المصادقة والأدوار

  1. الجداول الجديدة
    - `app_users` - ربط المستخدمين بالموظفين والأدوار
    - تحديث جدول `employees` لربطه بالمستخدمين

  2. الأدوار
    - `manager` - مدير النظام (صلاحيات كاملة)
    - `employee` - موظف عادي (صلاحيات محدودة)
    - `auditor` - مراجع (قراءة فقط)

  3. الأمان
    - تفعيل RLS على جميع الجداول
    - إنشاء سياسات الأمان المناسبة
*/

-- إنشاء نوع الأدوار
CREATE TYPE role_type AS ENUM ('manager', 'employee', 'auditor');

-- تحديث جدول الموظفين لإضافة ربط بالمستخدمين
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD CONSTRAINT ux_employees_name UNIQUE (name);

-- إنشاء جدول ربط المستخدمين بالأدوار
CREATE TABLE IF NOT EXISTS app_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  role role_type NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل RLS على الجداول
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول app_users
CREATE POLICY "app_users_self_select" ON app_users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() AND au.role = 'manager'
  ));

-- سياسات الأمان لجدول employees
CREATE POLICY "employees_select" ON employees
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employees_insert" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() AND au.role = 'manager'
  ));

CREATE POLICY "employees_update" ON employees
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() AND au.role = 'manager'
  ));

-- سياسات الأمان لجدول contracts
CREATE POLICY "contracts_select" ON contracts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('manager', 'employee')
  ));

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('manager', 'employee')
  ));

-- سياسات الأمان لجدول transactions
CREATE POLICY "transactions_select" ON transactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('manager', 'employee')
  ));

-- سياسات الأمان لجدول transaction_details
CREATE POLICY "transaction_details_select" ON transaction_details
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "transaction_details_insert" ON transaction_details
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('manager', 'employee')
  ));

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_employee ON app_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

-- دالة للحصول على دور المستخدم الحالي
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS role_type
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM app_users WHERE user_id = auth.uid();
$$;

-- دالة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() AND role = 'manager'
  );
$$;