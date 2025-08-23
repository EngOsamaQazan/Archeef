/*
  # إنشاء جدول app_users مع سياسات الأمان

  1. الجداول الجديدة
    - `app_users`
      - `user_id` (uuid, مرجع لـ auth.users)
      - `employee_id` (uuid, مرجع لـ employees)
      - `role` (enum: manager, employee, auditor)
      - `is_active` (boolean)
      - `created_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جدول `app_users`
    - سياسة للمستخدمين المصادق عليهم لقراءة بياناتهم
    - سياسة للمدراء لقراءة جميع البيانات
    - سياسة لإدراج البيانات الشخصية
*/

-- إنشاء نوع البيانات للأدوار إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM ('manager', 'employee', 'auditor');
    END IF;
END $$;

-- إنشاء جدول app_users إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS app_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    role role_type NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- تفعيل Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "app_users_self_select" ON app_users;
DROP POLICY IF EXISTS "app_users_manager_select" ON app_users;
DROP POLICY IF EXISTS "app_users_self_insert" ON app_users;
DROP POLICY IF EXISTS "app_users_self_update" ON app_users;

-- سياسة للمستخدمين لقراءة بياناتهم الشخصية أو للمدراء لقراءة جميع البيانات
CREATE POLICY "app_users_self_select"
    ON app_users
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.user_id = auth.uid() 
            AND au.role = 'manager'
        )
    );

-- سياسة لإدراج البيانات الشخصية
CREATE POLICY "app_users_self_insert"
    ON app_users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- سياسة لتحديث البيانات الشخصية أو للمدراء
CREATE POLICY "app_users_self_update"
    ON app_users
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.user_id = auth.uid() 
            AND au.role = 'manager'
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.user_id = auth.uid() 
            AND au.role = 'manager'
        )
    );

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_app_users_employee_id ON app_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(is_active);