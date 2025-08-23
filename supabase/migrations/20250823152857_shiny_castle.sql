/*
  # إصلاح كامل لسياسات RLS في جدول app_users

  1. المشكلة
    - خطأ infinite recursion في سياسات RLS
    - السياسات تحاول قراءة من نفس الجدول الذي تحميه

  2. الحل
    - حذف جميع السياسات الموجودة
    - إنشاء سياسات مبسطة بدون recursion
    - استخدام auth.uid() مباشرة

  3. السياسات الجديدة
    - المستخدمون يمكنهم قراءة وتعديل بياناتهم فقط
    - المدراء يمكنهم الوصول لجميع البيانات
*/

-- حذف جميع السياسات الموجودة
DROP POLICY IF EXISTS "app_users_select_policy" ON app_users;
DROP POLICY IF EXISTS "app_users_insert_policy" ON app_users;
DROP POLICY IF EXISTS "app_users_update_policy" ON app_users;
DROP POLICY IF EXISTS "app_users_delete_policy" ON app_users;
DROP POLICY IF EXISTS "app_users_manager_access" ON app_users;
DROP POLICY IF EXISTS "app_users_manager_full_access" ON app_users;
DROP POLICY IF EXISTS "Users can read own data" ON app_users;
DROP POLICY IF EXISTS "Users can insert own data" ON app_users;
DROP POLICY IF EXISTS "Users can update own data" ON app_users;
DROP POLICY IF EXISTS "Managers can access all data" ON app_users;

-- تعطيل RLS مؤقتاً لإنشاء السياسات الجديدة
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- إعادة تفعيل RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- سياسة SELECT: المستخدمون يمكنهم قراءة بياناتهم فقط
CREATE POLICY "app_users_select_own" ON app_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- سياسة INSERT: المستخدمون يمكنهم إدراج بياناتهم فقط
CREATE POLICY "app_users_insert_own" ON app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- سياسة UPDATE: المستخدمون يمكنهم تحديث بياناتهم فقط
CREATE POLICY "app_users_update_own" ON app_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- سياسة DELETE: المستخدمون يمكنهم حذف بياناتهم فقط
CREATE POLICY "app_users_delete_own" ON app_users
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- سياسة خاصة للمدراء: الوصول الكامل
-- نستخدم email بدلاً من role لتجنب recursion
CREATE POLICY "app_users_manager_access" ON app_users
  FOR ALL
  TO authenticated
  USING (
    auth.email() = 'osamaqazan89@gmail.com'
  )
  WITH CHECK (
    auth.email() = 'osamaqazan89@gmail.com'
  );

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_app_users_user_id ON app_users(user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role_active ON app_users(role, is_active) WHERE is_active = true;