/**
 * ملف الإعدادات - نظام الأرشيف
 * يحتوي على إعدادات الاتصال بقاعدة البيانات وثوابت النظام
 */

// إعدادات Supabase
const APP_CONFIG = {
  // معلومات الاتصال بقاعدة البيانات
  SUPABASE_URL: "https://jvfbcruxaitcjoiejjgu.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZmJjcnV4YWl0Y2pvaWVqamd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mjk2NDIsImV4cCI6MjA3MTAwNTY0Mn0.C8R7uaQ6UzkWyuw81JXs57m2g3sV6TiHAknV6F5rR3A",
  
  // إعدادات النظام
  APP_NAME: "نظام استلام وتسليم الوثائق",
  APP_VERSION: "2.0.0",
  DEBUG_MODE: false,
  
  // ثوابت النظام
  TRANSACTION_TYPES: [
    "تسليم واستلام"
  ],
  
  DOCUMENT_CATEGORIES: [
    "عقود",
    "كتب ومراسلات",
    "كتب حسم"
  ],
  
  DELIVERY_METHODS: [
    "باليد",
    "بريد أردني",
    "Aramex",
    "DHL"
  ],
  
  // طرق الشحن التي تتطلب رقم تتبع
  SHIPPING_METHODS: [
    "بريد أردني",
    "Aramex",
    "DHL"
  ]
};

// تصدير الإعدادات للاستخدام في الملفات الأخرى
window.APP_CONFIG = APP_CONFIG;