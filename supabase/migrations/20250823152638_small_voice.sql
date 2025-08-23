/*
  # إصلاح سياسات RLS لجدول app_users

  1. المشكلة
    - وجود حلقة لا نهائية في سياسات RLS لجدول app_users
    - السياسة app_users_manager_full_access تسبب recursion

  2. الحل
    - إزالة جميع السياسات الحالية
    - إنشاء سياسات مبسطة وآمنة
    - استخدام auth.uid() مباشرة بدلاً من الاستعلامات المعقدة

  3. السياسات الجديدة
    - سياسة للقراءة الشخصية
    - سياسة للتحديث الشخصي
    - سياسة للإدراج الشخصي
    - سياسة خاصة للمدراء (مبسطة)
*/

-- إزالة جميع السياسات الحالية
DROP POLICY IF EXISTS "app_users_insert_own" ON app_users;
DROP POLICY IF EXISTS "app_users_manager_full_access" ON app_users;
DROP POLICY IF EXISTS "app_users_select_own" ON app_users;
DROP POLICY IF EXISTS "app_users_update_own" ON app_users;

-- إنشاء سياسات جديدة مبسطة

-- سياسة القراءة: المستخدم يمكنه قراءة بياناته الشخصية فقط
CREATE POLICY "app_users_select_policy"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- سياسة الإدراج: المستخدم يمكنه إدراج بياناته الشخصية فقط
CREATE POLICY "app_users_insert_policy"
  ON app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- سياسة التحديث: المستخدم يمكنه تحديث بياناته الشخصية فقط
CREATE POLICY "app_users_update_policy"
  ON app_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- سياسة الحذف: المستخدم يمكنه حذف بياناته الشخصية فقط
CREATE POLICY "app_users_delete_policy"
  ON app_users
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- إنشاء دالة مساعدة للتحقق من دور المدير
CREATE OR REPLACE FUNCTION is_manager(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM app_users 
    WHERE user_id = user_uuid 
    AND role = 'manager'::role_type 
    AND is_active = true
  );
$$;

-- سياسة خاصة للمدراء للوصول الكامل (مبسطة لتجنب الـ recursion)
CREATE POLICY "app_users_manager_access"
  ON app_users
  FOR ALL
  TO authenticated
  USING (
    -- السماح للمدير بالوصول لجميع البيانات
    auth.uid() IN (
      SELECT user_id 
      FROM app_users 
      WHERE role = 'manager'::role_type 
      AND is_active = true
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- السماح للمدير بتعديل جميع البيانات
    auth.uid() IN (
      SELECT user_id 
      FROM app_users 
      WHERE role = 'manager'::role_type 
      AND is_active = true
      AND user_id = auth.uid()
    )
  );

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_app_users_manager_lookup 
ON app_users (user_id, role, is_active) 
WHERE role = 'manager' AND is_active = true;