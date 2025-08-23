/*
  # إنشاء المستخدم الإداري الأساسي

  1. إنشاء حساب المدير الأساسي
  2. ربطه بموظف في النظام
  3. منحه صلاحيات المدير
*/

-- إدراج الموظف الإداري إذا لم يكن موجوداً
INSERT INTO employees (name, department) 
VALUES ('أسامة قازان', 'مكتب')
ON CONFLICT (name) DO NOTHING;

-- ملاحظة: سيتم إنشاء المستخدم في Supabase Auth تلقائياً عند أول تسجيل دخول
-- أو يمكن إنشاؤه يدوياً من لوحة تحكم Supabase

-- دالة لربط المستخدم بالموظف عند التسجيل
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- البحث عن موظف بنفس البريد الإلكتروني أو إنشاء موظف جديد
  INSERT INTO app_users (user_id, employee_id, role)
  VALUES (
    NEW.id,
    (SELECT id FROM employees WHERE name = 'أسامة قازان' LIMIT 1),
    CASE 
      WHEN NEW.email = 'osamaqazan89@gmail.com' THEN 'manager'::role_type
      ELSE 'employee'::role_type
    END
  );
  
  -- تحديث employee لربطه بالمستخدم
  UPDATE employees 
  SET user_id = NEW.id 
  WHERE name = 'أسامة قازان' AND NEW.email = 'osamaqazan89@gmail.com';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتشغيل الدالة عند إنشاء مستخدم جديد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();