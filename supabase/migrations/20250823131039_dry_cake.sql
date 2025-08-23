/*
  # إنشاء المستخدم الإداري الأساسي
  
  هذا الملف ينشئ المستخدم الإداري مع ربطه بموظف في النظام
  
  المعلومات:
  - البريد الإلكتروني: osamaqazan89@gmail.com
  - كلمة المرور: HAmAS12852@
  - الدور: مدير النظام
*/

-- إنشاء موظف أسامة قازان إذا لم يكن موجوداً
INSERT INTO employees (name, department) 
SELECT 'أسامة قازان', 'مكتب'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'أسامة قازان');

-- ملاحظة: إنشاء المستخدم في auth.users يتم عبر Supabase Auth
-- لذلك سنحتاج لإنشاء المستخدم يدوياً في لوحة تحكم Supabase أو عبر API

-- بعد إنشاء المستخدم في auth.users، سنربطه بالموظف وندرجه في app_users
-- هذا سيتم تنفيذه عند أول تسجيل دخول للمستخدم

-- دالة لربط المستخدم بالموظف عند أول تسجيل دخول
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    employee_record employees%ROWTYPE;
BEGIN
    -- البحث عن الموظف المطابق للبريد الإلكتروني
    IF NEW.email = 'osamaqazan89@gmail.com' THEN
        SELECT * INTO employee_record FROM employees WHERE name = 'أسامة قازان' LIMIT 1;
        
        IF FOUND THEN
            -- ربط المستخدم بالموظف
            UPDATE employees SET user_id = NEW.id WHERE id = employee_record.id;
            
            -- إدراج المستخدم في app_users مع دور المدير
            INSERT INTO app_users (user_id, employee_id, role, is_active)
            VALUES (NEW.id, employee_record.id, 'manager', TRUE)
            ON CONFLICT (user_id) DO UPDATE SET
                employee_id = employee_record.id,
                role = 'manager',
                is_active = TRUE;
        END IF;
    ELSE
        -- للمستخدمين الآخرين، إنشاء حساب موظف عادي
        INSERT INTO app_users (user_id, role, is_active)
        VALUES (NEW.id, 'employee', TRUE)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء مشغل لمعالجة المستخدمين الجدد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- دالة لإنشاء المستخدم الإداري (للاستخدام عبر API)
CREATE OR REPLACE FUNCTION create_admin_user(
    admin_email TEXT,
    admin_password TEXT
) RETURNS JSON AS $$
DECLARE
    user_id UUID;
    employee_record employees%ROWTYPE;
    result JSON;
BEGIN
    -- التحقق من وجود المستخدم
    SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
    
    IF user_id IS NULL THEN
        -- إنشاء المستخدم (يتطلب صلاحيات service_role)
        SELECT auth.uid() INTO user_id;
        
        IF user_id IS NULL THEN
            result := json_build_object(
                'success', false,
                'message', 'يجب إنشاء المستخدم عبر Supabase Auth أولاً'
            );
            RETURN result;
        END IF;
    END IF;
    
    -- البحث عن الموظف
    SELECT * INTO employee_record FROM employees WHERE name = 'أسامة قازان' LIMIT 1;
    
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'message', 'لم يتم العثور على موظف أسامة قازان'
        );
        RETURN result;
    END IF;
    
    -- ربط المستخدم بالموظف
    UPDATE employees SET user_id = user_id WHERE id = employee_record.id;
    
    -- إدراج أو تحديث في app_users
    INSERT INTO app_users (user_id, employee_id, role, is_active)
    VALUES (user_id, employee_record.id, 'manager', TRUE)
    ON CONFLICT (user_id) DO UPDATE SET
        employee_id = employee_record.id,
        role = 'manager',
        is_active = TRUE;
    
    result := json_build_object(
        'success', true,
        'message', 'تم إنشاء المستخدم الإداري بنجاح',
        'user_id', user_id,
        'employee_id', employee_record.id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;