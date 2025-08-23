/**
 * إعدادات التطبيق الرئيسية
 * Application Configuration
 */

// إعدادات Supabase
const SUPABASE_CONFIG = {
    url: 'https://jvfbcruxaitcjoiejjgu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZmJjcnV4YWl0Y2pvaWVqamd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mjk2NDIsImV4cCI6MjA3MTAwNTY0Mn0.C8R7uaQ6UzkWyuw81JXs57m2g3sV6TiHAknV6F5rR3A'
};

// إعدادات التطبيق
const APP_CONFIG = {
    name: 'نظام إدارة الوثائق',
    version: '2.0.0',
    author: 'Document Management Team',
    
    // إعدادات الواجهة
    ui: {
        animationDuration: 300,
        toastDuration: 5000,
        loadingDelay: 500,
        autoRefreshInterval: 30000 // 30 ثانية
    },
    
    // إعدادات التقارير
    reports: {
        defaultPeriod: 'today',
        maxRecords: 1000,
        exportFormats: ['pdf', 'excel']
    },
    
    // إعدادات البحث
    search: {
        minSearchLength: 1,
        maxResults: 50,
        searchDelay: 300
    },
    
    // إعدادات الطباعة
    print: {
        paperSize: 'A4',
        orientation: 'portrait',
        margins: '20mm'
    }
};

// بيانات الموظفين الافتراضية
const DEFAULT_EMPLOYEES = {
    مكتب: ['ربى الشريف', 'صفاء ابو قديري'],
    أرشيف: ['مؤمن قازان', 'حسان قازان', 'عمار قازان']
};

// أنواع الحركات المتاحة
const TRANSACTION_TYPES = {
    'استلام': {
        label: 'استلام من الأرشيف',
        icon: '📥',
        color: 'success'
    },
    'تسليم': {
        label: 'تسليم إلى الأرشيف',
        icon: '📤',
        color: 'warning'
    }
};

// حالات العقود
const CONTRACT_STATUSES = {
    'متاح': {
        label: 'متاح',
        color: 'success',
        icon: '✅'
    },
    'مشغول': {
        label: 'مشغول',
        color: 'warning',
        icon: '⏳'
    },
    'مؤرشف': {
        label: 'مؤرشف',
        color: 'info',
        icon: '📦'
    }
};

// رسائل النظام
const MESSAGES = {
    success: {
        transactionSaved: 'تم حفظ الحركة بنجاح!',
        dataLoaded: 'تم تحميل البيانات بنجاح',
        reportGenerated: 'تم إنشاء التقرير بنجاح',
        contractFound: 'تم العثور على العقد',
        formCleared: 'تم مسح النموذج'
    },
    error: {
        requiredFields: 'يرجى ملء جميع الحقول المطلوبة',
        contractNotFound: 'لم يتم العثور على العقد',
        databaseError: 'حدث خطأ في قاعدة البيانات',
        networkError: 'خطأ في الاتصال بالشبكة',
        unknownError: 'حدث خطأ غير متوقع'
    },
    warning: {
        unsavedChanges: 'لديك تغييرات غير محفوظة',
        confirmDelete: 'هل أنت متأكد من الحذف؟',
        noData: 'لا توجد بيانات للعرض'
    },
    info: {
        loading: 'جاري التحميل...',
        processing: 'جاري المعالجة...',
        searching: 'جاري البحث...',
        generating: 'جاري إنشاء التقرير...'
    }
};

// إعدادات التحقق من صحة البيانات
const VALIDATION_RULES = {
    contractNumber: {
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\u0600-\u06FF\s-_]+$/,
        required: true
    },
    employeeName: {
        minLength: 2,
        maxLength: 255,
        pattern: /^[\u0600-\u06FF\s]+$/,
        required: true
    },
    notes: {
        maxLength: 1000,
        required: false
    }
};

// تصدير الإعدادات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        APP_CONFIG,
        DEFAULT_EMPLOYEES,
        TRANSACTION_TYPES,
        CONTRACT_STATUSES,
        MESSAGES,
        VALIDATION_RULES
    };
}