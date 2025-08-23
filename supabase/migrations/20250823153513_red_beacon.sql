/*
  # إصلاح كامل لسياسات RLS والوصول للبيانات

  1. إصلاح سياسات app_users
  2. إصلاح سياسات الجداول الأخرى
  3. إضافة صلاحيات للأدوار المختلفة
  4. ضمان الوصول للبيانات الأساسية
*/

-- تعطيل RLS مؤقتاً لحل المشاكل
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_details DISABLE ROW LEVEL SECURITY;

-- حذف جميع السياسات الموجودة
DROP POLICY IF EXISTS "app_users_select_own" ON app_users;
DROP POLICY IF EXISTS "app_users_insert_own" ON app_users;
DROP POLICY IF EXISTS "app_users_update_own" ON app_users;
DROP POLICY IF EXISTS "app_users_delete_own" ON app_users;
DROP POLICY IF EXISTS "app_users_manager_access" ON app_users;
DROP POLICY IF EXISTS "app_users_manager_full_access" ON app_users;

-- إعادة تفعيل RLS مع سياسات مبسطة
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- سياسات مبسطة لـ app_users
CREATE POLICY "Allow authenticated users to read own data" ON app_users
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert own data" ON app_users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update own data" ON app_users
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- سياسة للمدراء (بدون recursion)
CREATE POLICY "Allow manager full access" ON app_users
    FOR ALL TO authenticated
    USING (auth.email() = 'osamaqazan89@gmail.com');

-- إعادة تفعيل RLS للجداول الأخرى مع سياسات مبسطة
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read employees" ON employees
    FOR SELECT TO authenticated
    USING (true);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to access contracts" ON contracts
    FOR ALL TO authenticated
    USING (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to access transactions" ON transactions
    FOR ALL TO authenticated
    USING (true);

ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to access transaction_details" ON transaction_details
    FOR ALL TO authenticated
    USING (true);

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_app_users_user_id ON app_users(user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- إدراج بيانات افتراضية إذا لم تكن موجودة
INSERT INTO employees (name, department) VALUES
    ('ربى الشريف', 'مكتب'),
    ('صفاء ابو قديري', 'مكتب'),
    ('مؤمن قازان', 'أرشيف'),
    ('حسان قازان', 'أرشيف'),
    ('عمار قازان', 'أرشيف'),
    ('أسامة قازان', 'مكتب')
ON CONFLICT (name) DO NOTHING;