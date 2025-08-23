/*
  # إصلاح خطأ قاعدة البيانات وإنشاء نظام المصادقة

  1. الجداول الجديدة
    - `app_users` - ربط المستخدمين بالأدوار والموظفين
    - إنشاء أنواع البيانات المطلوبة

  2. الأمان
    - تفعيل RLS على جدول app_users
    - إضافة سياسات للقراءة والكتابة
    - سياسة خاصة لإنشاء المستخدمين الجدد

  3. الوظائف
    - وظيفة تلقائية لإنشاء app_user عند تسجيل مستخدم جديد
    - مشغل (trigger) لتنفيذ الوظيفة تلقائياً
*/

-- إنشاء نوع البيانات للأدوار
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM ('manager', 'employee', 'auditor');
  END IF;
END $$;

-- إنشاء جدول app_users
CREATE TABLE IF NOT EXISTS app_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  role role_type NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_app_users_employee_id ON app_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(is_active);

-- تفعيل Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إن وجدت
DROP POLICY IF EXISTS "app_users_self_select" ON app_users;
DROP POLICY IF EXISTS "app_users_self_insert" ON app_users;
DROP POLICY IF EXISTS "app_users_self_update" ON app_users;

-- سياسة القراءة: المستخدمون يمكنهم قراءة بياناتهم أو المديرون يمكنهم قراءة كل شيء
CREATE POLICY "app_users_self_select" ON app_users
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

-- سياسة الإدراج: المستخدمون يمكنهم إنشاء بياناتهم الخاصة
CREATE POLICY "app_users_self_insert" ON app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسة التحديث: المستخدمون يمكنهم تحديث بياناتهم أو المديرون يمكنهم تحديث كل شيء
CREATE POLICY "app_users_self_update" ON app_users
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

-- وظيفة لإنشاء app_user تلقائياً عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_users (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email = 'osamaqazan89@gmail.com' THEN 'manager'::role_type
      ELSE 'employee'::role_type
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث خطأ، نسجل الخطأ ولكن لا نمنع إنشاء المستخدم
    RAISE WARNING 'خطأ في إنشاء app_user للمستخدم %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف المشغل الموجود إن وجد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- إنشاء مشغل لتنفيذ الوظيفة عند إنشاء مستخدم جديد
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- إنشاء المستخدم الإداري إذا لم يكن موجوداً
DO $$
DECLARE
  admin_user_id UUID;
  admin_employee_id UUID;
BEGIN
  -- التحقق من وجود المستخدم الإداري
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'osamaqazan89@gmail.com';
  
  -- إذا لم يكن موجوداً، قم بإنشائه
  IF admin_user_id IS NULL THEN
    -- إنشاء المستخدم في auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'osamaqazan89@gmail.com',
      crypt('HAmAS12852@', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      false,
      '',
      '',
      '',
      ''
    ) RETURNING id INTO admin_user_id;
    
    -- إنشاء الهوية في auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      format('{"sub": "%s", "email": "%s"}', admin_user_id::text, 'osamaqazan89@gmail.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
    
    RAISE NOTICE 'تم إنشاء المستخدم الإداري بنجاح: %', admin_user_id;
  ELSE
    RAISE NOTICE 'المستخدم الإداري موجود مسبقاً: %', admin_user_id;
  END IF;
  
  -- التأكد من وجود موظف للمدير
  SELECT id INTO admin_employee_id 
  FROM employees 
  WHERE name = 'أسامة قازان - مدير النظام';
  
  IF admin_employee_id IS NULL THEN
    INSERT INTO employees (name, department)
    VALUES ('أسامة قازان - مدير النظام', 'مكتب')
    RETURNING id INTO admin_employee_id;
    
    RAISE NOTICE 'تم إنشاء موظف المدير: %', admin_employee_id;
  END IF;
  
  -- التأكد من وجود app_user للمدير
  IF NOT EXISTS (SELECT 1 FROM app_users WHERE user_id = admin_user_id) THEN
    INSERT INTO app_users (user_id, employee_id, role)
    VALUES (admin_user_id, admin_employee_id, 'manager');
    
    RAISE NOTICE 'تم ربط المستخدم الإداري بالموظف';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'خطأ في إنشاء المستخدم الإداري: %', SQLERRM;
END $$;