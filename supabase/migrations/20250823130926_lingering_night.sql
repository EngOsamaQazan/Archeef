/*
  # إعداد نظام المصادقة والأدوار بشكل آمن
  
  هذا الملف يتحقق من وجود الجداول والأعمدة قبل إنشائها
  ويضمن التوافق مع البنية الحالية لقاعدة البيانات
  
  1. التحقق من وجود الجداول الأساسية
  2. إنشاء الجداول المفقودة فقط
  3. إضافة الأعمدة المفقودة للجداول الموجودة
  4. إعداد نظام الأدوار والصلاحيات
  5. تفعيل Row Level Security
  6. إنشاء السياسات الأمنية
*/

-- تفعيل امتدادات مطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- إنشاء أنواع البيانات المخصصة إذا لم تكن موجودة
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM ('manager', 'employee', 'auditor');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'handover_status') THEN
        CREATE TYPE handover_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'cancelled', 'override_approved');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('handover_pending', 'handover_accepted', 'handover_rejected', 'handover_expired', 'handover_cancelled', 'handover_override');
    END IF;
END $$;

-- 1. التحقق من جدول الموظفين وإنشاؤه إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL CHECK (department IN ('مكتب', 'أرشيف', 'مبيعات')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

-- إضافة الأعمدة المفقودة لجدول الموظفين
DO $$
BEGIN
    -- إضافة عمود user_id إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE employees ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. التحقق من جدول العقود وإنشاؤه إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    current_holder_id UUID REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'متاح',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء الفهارس للعقود
CREATE INDEX IF NOT EXISTS idx_contracts_holder ON contracts(current_holder_id);
CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number);

-- 3. التحقق من جدول الحركات وإنشاؤه إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('استلام', 'تسليم', 'تسليم واستلام', 'نقل')),
    from_employee_id UUID REFERENCES employees(id),
    to_employee_id UUID REFERENCES employees(id),
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    receipt_number VARCHAR(100) UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    operation_category VARCHAR(50) DEFAULT 'عقود',
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('بريد أردني', 'Aramex', 'DHL', 'باليد')),
    tracking_number VARCHAR(100),
    shipment_status VARCHAR(20) CHECK (shipment_status IN ('قيد الشحن', 'وصلت', 'مرتجع/مفقود')),
    received_confirmed BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMPTZ,
    receiver_employee_id UUID REFERENCES employees(id),
    contents TEXT,
    contents_ok BOOLEAN,
    missing_notes TEXT,
    receiver_notes TEXT,
    sdl_customer_name TEXT,
    sdl_contract_id UUID REFERENCES contracts(id),
    sdl_judiciary_number VARCHAR(100),
    sdl_judiciary_year INTEGER
);

-- إضافة الأعمدة المفقودة لجدول الحركات
DO $$
BEGIN
    -- إضافة الأعمدة الجديدة إذا لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'operation_category') THEN
        ALTER TABLE transactions ADD COLUMN operation_category VARCHAR(50) DEFAULT 'عقود';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'delivery_method') THEN
        ALTER TABLE transactions ADD COLUMN delivery_method VARCHAR(20) CHECK (delivery_method IN ('بريد أردني', 'Aramex', 'DHL', 'باليد'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'tracking_number') THEN
        ALTER TABLE transactions ADD COLUMN tracking_number VARCHAR(100);
    END IF;
    
    -- إضافة باقي الأعمدة...
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'shipment_status') THEN
        ALTER TABLE transactions ADD COLUMN shipment_status VARCHAR(20) CHECK (shipment_status IN ('قيد الشحن', 'وصلت', 'مرتجع/مفقود'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'received_confirmed') THEN
        ALTER TABLE transactions ADD COLUMN received_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'received_at') THEN
        ALTER TABLE transactions ADD COLUMN received_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'receiver_employee_id') THEN
        ALTER TABLE transactions ADD COLUMN receiver_employee_id UUID REFERENCES employees(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'contents') THEN
        ALTER TABLE transactions ADD COLUMN contents TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'contents_ok') THEN
        ALTER TABLE transactions ADD COLUMN contents_ok BOOLEAN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'missing_notes') THEN
        ALTER TABLE transactions ADD COLUMN missing_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'receiver_notes') THEN
        ALTER TABLE transactions ADD COLUMN receiver_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'sdl_customer_name') THEN
        ALTER TABLE transactions ADD COLUMN sdl_customer_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'sdl_contract_id') THEN
        ALTER TABLE transactions ADD COLUMN sdl_contract_id UUID REFERENCES contracts(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'sdl_judiciary_number') THEN
        ALTER TABLE transactions ADD COLUMN sdl_judiciary_number VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'sdl_judiciary_year') THEN
        ALTER TABLE transactions ADD COLUMN sdl_judiciary_year INTEGER;
    END IF;
END $$;

-- إنشاء الفهارس للحركات
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_delivery_method ON transactions(delivery_method);
CREATE INDEX IF NOT EXISTS idx_transactions_operation_category ON transactions(operation_category);
CREATE INDEX IF NOT EXISTS idx_transactions_shipment_status ON transactions(shipment_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tracking_unique ON transactions(tracking_number) WHERE tracking_number IS NOT NULL;

-- 4. التحقق من جدول تفاصيل الحركات وإنشاؤه إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS transaction_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء الفهارس لتفاصيل الحركات
CREATE INDEX IF NOT EXISTS idx_transaction_details_transaction ON transaction_details(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_details_contract_created_at ON transaction_details(contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_details_tx_id ON transaction_details(transaction_id);

-- 5. إنشاء جدول مستخدمي التطبيق
CREATE TABLE IF NOT EXISTS app_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    role role_type NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. إنشاء جدول طلبات التسليم
CREATE TABLE IF NOT EXISTS handover_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    from_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    to_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status handover_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    reason TEXT,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    handover_code VARCHAR(6)
);

-- إنشاء الفهارس لطلبات التسليم
CREATE INDEX IF NOT EXISTS idx_hr_status ON handover_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_to_user ON handover_requests(to_user_id);

-- 7. إنشاء جدول عناصر طلبات التسليم
CREATE TABLE IF NOT EXISTS handover_request_items (
    id BIGSERIAL PRIMARY KEY,
    handover_request_id UUID NOT NULL REFERENCES handover_requests(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    UNIQUE(handover_request_id, contract_id)
);

-- إنشاء الفهارس لعناصر طلبات التسليم
CREATE INDEX IF NOT EXISTS idx_hri_contract ON handover_request_items(contract_id);

-- 8. إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    payload JSONB NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. تفعيل Row Level Security على جميع الجداول
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 10. إنشاء السياسات الأمنية

-- سياسات app_users
DROP POLICY IF EXISTS "app_users_self_select" ON app_users;
CREATE POLICY "app_users_self_select" ON app_users
    FOR SELECT TO public
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.user_id = auth.uid() AND au.role = 'manager'
        )
    );

-- سياسات handover_requests
DROP POLICY IF EXISTS "hr_insert" ON handover_requests;
CREATE POLICY "hr_insert" ON handover_requests
    FOR INSERT TO public
    WITH CHECK (auth.uid() = created_by_user_id);

DROP POLICY IF EXISTS "hr_select" ON handover_requests;
CREATE POLICY "hr_select" ON handover_requests
    FOR SELECT TO public
    USING (
        auth.uid() = created_by_user_id OR 
        auth.uid() = COALESCE(to_user_id, '00000000-0000-0000-0000-000000000000'::uuid) OR
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.user_id = auth.uid() AND au.role = 'manager'
        )
    );

DROP POLICY IF EXISTS "hr_update_status" ON handover_requests;
CREATE POLICY "hr_update_status" ON handover_requests
    FOR UPDATE TO public
    USING (
        auth.uid() = COALESCE(to_user_id, '00000000-0000-0000-0000-000000000000'::uuid) OR
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.user_id = auth.uid() AND au.role = 'manager'
        )
    )
    WITH CHECK (true);

-- سياسات handover_request_items
DROP POLICY IF EXISTS "hri_insert" ON handover_request_items;
CREATE POLICY "hri_insert" ON handover_request_items
    FOR INSERT TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM handover_requests r 
            WHERE r.id = handover_request_items.handover_request_id 
            AND auth.uid() = r.created_by_user_id 
            AND r.status = 'pending'
        )
    );

DROP POLICY IF EXISTS "hri_select" ON handover_request_items;
CREATE POLICY "hri_select" ON handover_request_items
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM handover_requests r 
            WHERE r.id = handover_request_items.handover_request_id 
            AND (
                auth.uid() = r.created_by_user_id OR 
                auth.uid() = COALESCE(r.to_user_id, '00000000-0000-0000-0000-000000000000'::uuid) OR
                EXISTS (
                    SELECT 1 FROM app_users au 
                    WHERE au.user_id = auth.uid() AND au.role = 'manager'
                )
            )
        )
    );

-- سياسات notifications
DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- 11. إنشاء الدوال المطلوبة

-- دالة للتحقق من حقول SDL
CREATE OR REPLACE FUNCTION enforce_sdl_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من حقول SDL عند الحاجة
    IF NEW.operation_category = 'كتب حسم' THEN
        IF NEW.sdl_customer_name IS NULL OR NEW.sdl_contract_id IS NULL THEN
            RAISE EXCEPTION 'حقول SDL مطلوبة لعمليات كتب الحسم';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة للتحقق من رقم التتبع للشحن
CREATE OR REPLACE FUNCTION require_tracking_for_shipping()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من رقم التتبع للشحن
    IF NEW.delivery_method IN ('بريد أردني', 'Aramex', 'DHL') THEN
        IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
            RAISE EXCEPTION 'رقم التتبع مطلوب لطرق الشحن';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة إشعارات طلبات التسليم
CREATE OR REPLACE FUNCTION notify_on_handover_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- إضافة إشعار عند إنشاء طلب تسليم جديد
    IF NEW.to_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, payload)
        VALUES (
            NEW.to_user_id,
            'handover_pending',
            jsonb_build_object(
                'handover_request_id', NEW.id,
                'from_employee_id', NEW.from_employee_id,
                'message', 'طلب تسليم جديد'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة إشعارات تحديث طلبات التسليم
CREATE OR REPLACE FUNCTION notify_on_handover_update()
RETURNS TRIGGER AS $$
BEGIN
    -- إضافة إشعار عند تحديث حالة طلب التسليم
    IF OLD.status != NEW.status THEN
        INSERT INTO notifications (user_id, type, payload)
        VALUES (
            NEW.created_by_user_id,
            CASE NEW.status
                WHEN 'accepted' THEN 'handover_accepted'
                WHEN 'rejected' THEN 'handover_rejected'
                WHEN 'expired' THEN 'handover_expired'
                WHEN 'cancelled' THEN 'handover_cancelled'
                ELSE 'handover_override'
            END,
            jsonb_build_object(
                'handover_request_id', NEW.id,
                'status', NEW.status,
                'message', 'تم تحديث حالة طلب التسليم'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. إنشاء المشغلات (Triggers)

-- مشغل للتحقق من حقول SDL
DROP TRIGGER IF EXISTS trg_enforce_sdl_fields ON transactions;
CREATE TRIGGER trg_enforce_sdl_fields
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION enforce_sdl_fields();

-- مشغل للتحقق من رقم التتبع
DROP TRIGGER IF EXISTS trg_require_tracking_for_shipping ON transactions;
CREATE TRIGGER trg_require_tracking_for_shipping
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION require_tracking_for_shipping();

-- مشغل إشعارات إنشاء طلبات التسليم
DROP TRIGGER IF EXISTS trg_notify_hr_insert ON handover_requests;
CREATE TRIGGER trg_notify_hr_insert
    AFTER INSERT ON handover_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_handover_insert();

-- مشغل إشعارات تحديث طلبات التسليم
DROP TRIGGER IF EXISTS trg_notify_hr_update ON handover_requests;
CREATE TRIGGER trg_notify_hr_update
    AFTER UPDATE ON handover_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_handover_update();

-- 13. إدراج البيانات الأساسية

-- إدراج الموظفين الأساسيين إذا لم يكونوا موجودين
INSERT INTO employees (name, department) 
SELECT 'ربى الشريف', 'مكتب'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'ربى الشريف');

INSERT INTO employees (name, department) 
SELECT 'صفاء ابو قديري', 'مكتب'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'صفاء ابو قديري');

INSERT INTO employees (name, department) 
SELECT 'مؤمن قازان', 'أرشيف'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'مؤمن قازان');

INSERT INTO employees (name, department) 
SELECT 'حسان قازان', 'أرشيف'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'حسان قازان');

INSERT INTO employees (name, department) 
SELECT 'عمار قازان', 'أرشيف'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'عمار قازان');

-- إنشاء فهرس فريد لاسم الموظف
CREATE UNIQUE INDEX IF NOT EXISTS ux_employees_name ON employees(name);