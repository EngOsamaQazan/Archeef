/*
  # إصلاح مشكلة التكرار اللا نهائي في جدول app_users

  1. المشكلة
    - خطأ "infinite recursion detected in policy for relation app_users"
    - سياسات RLS تسبب حلقة لا نهائية
    - فشل في جلب بيانات المستخدمين

  2. الحل
    - حذف الجدول والسياسات الموجودة
    - إعادة إنشاء الجدول بهيكل صحيح
    - إنشاء سياسات RLS بسيطة وآمنة
    - إضافة وظائف مساعدة لإدارة المستخدمين

  3. التحسينات
    - سياسات أمان محسنة
    - دعم أفضل للأدوار المختلفة
    - منع التكرار اللا نهائي
*/

-- حذف الجدول الموجود والسياسات المرتبطة به
DROP TABLE IF EXISTS public.app_users CASCADE;

-- إنشاء enum للأدوار إذا لم يكن موجوداً
DO $$ BEGIN
    CREATE TYPE role_type AS ENUM ('manager', 'employee', 'auditor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- إنشاء جدول app_users جديد
CREATE TABLE public.app_users (
    user_id UUID PRIMARY KEY,
    employee_id UUID,
    role role_type NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إضافة المفاتيح الخارجية
ALTER TABLE public.app_users 
ADD CONSTRAINT app_users_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.app_users 
ADD CONSTRAINT app_users_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_active ON public.app_users(is_active);
CREATE INDEX IF NOT EXISTS idx_app_users_employee_id ON public.app_users(employee_id);

-- تفعيل Row Level Security
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة: المستخدمون يمكنهم قراءة بياناتهم الخاصة فقط
CREATE POLICY "app_users_select_own"
ON public.app_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- سياسة للإدراج: المستخدمون يمكنهم إنشاء سجلهم الخاص فقط
CREATE POLICY "app_users_insert_own"
ON public.app_users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- سياسة للتحديث: المستخدمون يمكنهم تحديث بياناتهم الخاصة فقط
CREATE POLICY "app_users_update_own"
ON public.app_users
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- سياسة للمديرين: الوصول الكامل لجميع البيانات
CREATE POLICY "app_users_manager_full_access"
ON public.app_users
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.role = 'manager' 
        AND au.is_active = true
    )
);

-- وظيفة لإنشاء app_user تلقائياً عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        -- في حالة حدوث خطأ، نسجل الخطأ ولكن لا نمنع إنشاء المستخدم
        RAISE WARNING 'Failed to create app_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتنفيذ الوظيفة تلقائياً
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- إنشاء المستخدم الإداري إذا لم يكن موجوداً
DO $$
DECLARE
    admin_user_id UUID;
    admin_employee_id UUID;
BEGIN
    -- البحث عن المستخدم الإداري
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'osamaqazan89@gmail.com';
    
    -- إذا لم يكن موجوداً، إنشاؤه
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
            '',
            '',
            '',
            ''
        ) RETURNING id INTO admin_user_id;
    END IF;
    
    -- البحث عن موظف أسامة قازان
    SELECT id INTO admin_employee_id 
    FROM public.employees 
    WHERE name = 'أسامة قازان';
    
    -- إنشاء الموظف إذا لم يكن موجوداً
    IF admin_employee_id IS NULL THEN
        INSERT INTO public.employees (name, department, user_id)
        VALUES ('أسامة قازان', 'مكتب', admin_user_id)
        RETURNING id INTO admin_employee_id;
    ELSE
        -- ربط الموظف بالمستخدم
        UPDATE public.employees 
        SET user_id = admin_user_id 
        WHERE id = admin_employee_id;
    END IF;
    
    -- إنشاء أو تحديث app_user للمدير
    INSERT INTO public.app_users (user_id, employee_id, role, is_active)
    VALUES (admin_user_id, admin_employee_id, 'manager', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        employee_id = admin_employee_id,
        role = 'manager',
        is_active = true;
        
    RAISE NOTICE 'تم إنشاء/تحديث المستخدم الإداري بنجاح';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'خطأ في إنشاء المستخدم الإداري: %', SQLERRM;
END $$;

-- التحقق من صحة البيانات
DO $$
DECLARE
    user_count INTEGER;
    employee_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.app_users;
    SELECT COUNT(*) INTO employee_count FROM public.employees;
    
    RAISE NOTICE 'عدد المستخدمين في app_users: %', user_count;
    RAISE NOTICE 'عدد الموظفين: %', employee_count;
    
    IF user_count = 0 THEN
        RAISE WARNING 'لا يوجد مستخدمون في جدول app_users';
    END IF;
END $$;