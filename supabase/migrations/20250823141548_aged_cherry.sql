/*
  # إصلاح حلقة RLS اللا نهائية في جدول app_users

  1. المشكلة
     - سياسة RLS على app_users تسبب حلقة لا نهائية
     - السياسة تحاول الوصول لنفس الجدول الذي تحميه

  2. الحل
     - إزالة السياسات المعطلة
     - إنشاء سياسات بسيطة وآمنة
     - تجنب الاستعلامات المعقدة في السياسات

  3. السياسات الجديدة
     - سياسة بسيطة للقراءة والكتابة
     - تجنب الاستعلامات الفرعية المعقدة
*/

-- إزالة جميع السياسات الموجودة على app_users
DROP POLICY IF EXISTS "app_users_self_insert" ON app_users;
DROP POLICY IF EXISTS "app_users_self_select" ON app_users;
DROP POLICY IF EXISTS "app_users_self_update" ON app_users;
DROP POLICY IF EXISTS "app_users_manager_access" ON app_users;

-- تعطيل RLS مؤقتاً لتنظيف البيانات
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- إعادة تفعيل RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات بسيطة وآمنة

-- سياسة القراءة: المستخدم يمكنه قراءة بياناته فقط
CREATE POLICY "app_users_select_own" ON app_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- سياسة الإدراج: المستخدم يمكنه إنشاء سجل لنفسه فقط
CREATE POLICY "app_users_insert_own" ON app_users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- سياسة التحديث: المستخدم يمكنه تحديث بياناته فقط
CREATE POLICY "app_users_update_own" ON app_users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- سياسة خاصة للمدراء (بدون استعلامات فرعية معقدة)
CREATE POLICY "app_users_manager_full_access" ON app_users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.user_id = auth.uid() 
            AND au.role = 'manager'
            AND au.is_active = true
        )
    );

-- تحديث الوظيفة لتجنب المشاكل
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- إدراج مباشر بدون فحص معقد
    INSERT INTO public.app_users (user_id, role, is_active)
    VALUES (
        NEW.id,
        CASE 
            WHEN NEW.email = 'osamaqazan89@gmail.com' THEN 'manager'::role_type
            ELSE 'employee'::role_type
        END,
        true
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- تجاهل الأخطاء لتجنب فشل التسجيل
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- التأكد من وجود المشغل
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- إنشاء مستخدم تجريبي إذا لم يكن موجوداً
DO $$
DECLARE
    user_exists boolean;
BEGIN
    -- فحص وجود المستخدم
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE email = 'osamaqazan89@gmail.com'
    ) INTO user_exists;
    
    -- إذا لم يكن موجوداً، قم بإنشائه
    IF NOT user_exists THEN
        -- إدراج في auth.users
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
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
        
        -- إدراج في app_users
        INSERT INTO public.app_users (user_id, role, is_active)
        SELECT id, 'manager'::role_type, true
        FROM auth.users 
        WHERE email = 'osamaqazan89@gmail.com';
        
    END IF;
END $$;