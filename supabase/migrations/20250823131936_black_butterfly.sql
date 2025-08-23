/*
  # إنشاء المستخدم الإداري في نظام المصادقة

  1. إنشاء المستخدم
    - البريد الإلكتروني: osamaqazan89@gmail.com
    - كلمة المرور: HAmAS12852@
    - تأكيد البريد الإلكتروني تلقائياً
  
  2. ربط المستخدم بجدول app_users
    - الدور: manager
    - الحالة: نشط
  
  3. إنشاء موظف مرتبط (إذا لم يكن موجوداً)
    - الاسم: أسامة قازان
    - القسم: مكتب
*/

-- إنشاء المستخدم في جدول auth.users مباشرة
DO $$
DECLARE
    user_uuid uuid;
    employee_uuid uuid;
BEGIN
    -- التحقق من وجود المستخدم
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'osamaqazan89@gmail.com';
    
    -- إذا لم يكن المستخدم موجوداً، قم بإنشائه
    IF user_uuid IS NULL THEN
        -- إنشاء UUID للمستخدم
        user_uuid := gen_random_uuid();
        
        -- إدراج المستخدم في جدول auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            user_uuid,
            'authenticated',
            'authenticated',
            'osamaqazan89@gmail.com',
            crypt('HAmAS12852@', gen_salt('bf')),
            NOW(),
            NOW(),
            '',
            NOW(),
            '',
            NULL,
            '',
            '',
            NULL,
            NULL,
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            FALSE,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            '',
            0,
            NULL,
            '',
            NULL,
            FALSE,
            NULL
        );
        
        -- إدراج هوية المستخدم في جدول auth.identities
        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at,
            id
        ) VALUES (
            'osamaqazan89@gmail.com',
            user_uuid,
            format('{"sub": "%s", "email": "%s", "email_verified": %s, "phone_verified": %s}', 
                   user_uuid::text, 
                   'osamaqazan89@gmail.com', 
                   'true', 
                   'false')::jsonb,
            'email',
            NOW(),
            NOW(),
            NOW(),
            gen_random_uuid()
        );
        
        RAISE NOTICE 'تم إنشاء المستخدم الإداري: %', user_uuid;
    ELSE
        RAISE NOTICE 'المستخدم الإداري موجود بالفعل: %', user_uuid;
    END IF;
    
    -- التحقق من وجود الموظف
    SELECT id INTO employee_uuid 
    FROM employees 
    WHERE name = 'أسامة قازان';
    
    -- إذا لم يكن الموظف موجوداً، قم بإنشائه
    IF employee_uuid IS NULL THEN
        INSERT INTO employees (name, department, user_id)
        VALUES ('أسامة قازان', 'مكتب', user_uuid)
        RETURNING id INTO employee_uuid;
        
        RAISE NOTICE 'تم إنشاء الموظف: %', employee_uuid;
    ELSE
        -- ربط الموظف بالمستخدم إذا لم يكن مربوطاً
        UPDATE employees 
        SET user_id = user_uuid 
        WHERE id = employee_uuid AND user_id IS NULL;
        
        RAISE NOTICE 'الموظف موجود بالفعل: %', employee_uuid;
    END IF;
    
    -- التحقق من وجود المستخدم في جدول app_users
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE user_id = user_uuid) THEN
        INSERT INTO app_users (user_id, employee_id, role, is_active)
        VALUES (user_uuid, employee_uuid, 'manager', true);
        
        RAISE NOTICE 'تم ربط المستخدم بجدول app_users';
    ELSE
        -- تحديث البيانات إذا كانت موجودة
        UPDATE app_users 
        SET employee_id = employee_uuid, role = 'manager', is_active = true
        WHERE user_id = user_uuid;
        
        RAISE NOTICE 'تم تحديث بيانات المستخدم في app_users';
    END IF;
    
END $$;