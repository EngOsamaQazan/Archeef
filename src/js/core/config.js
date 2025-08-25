/**
 * @file config.js
 * @description ملف الإعدادات الرئيسي لنظام الأرشيف
 * @version 2.0.0
 */

/**
 * كائن الإعدادات الرئيسي للتطبيق
 * @namespace
 */
const ArcheefConfig = {
  /**
   * معلومات التطبيق الأساسية
   */
  app: {
    name: "نظام استلام وتسليم الوثائق",
    version: "2.0.0",
    debugMode: false,
    copyright: `© ${new Date().getFullYear()} نظام الأرشيف - جميع الحقوق محفوظة`
  },
  
  /**
   * إعدادات الاتصال بقاعدة البيانات Supabase
   */
  supabase: {
    url: "https://jvfbcrwaitcjoiejjgu.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZmJjcndhaXRjam9pZWpqZ3UiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwNDEzNHZGRjR9.NtOiJzdLYOvnB.C8R7uoQGUzNyuw81Jxs57m2g3sV6TH4AnV6FsR34",
    tables: {
      employees: "employees",
      transactions: "transactions",
      contracts: "contracts"
    }
  },
  
  /**
   * ثوابت النظام والقيم المرجعية
   */
  constants: {
    /**
     * أنواع العمليات المتاحة
     */
    transactionTypes: [
      "تسليم واستلام"
    ],
    
    /**
     * فئات المستندات
     */
    documentCategories: [
      "عقود",
      "كتب ومراسلات",
      "كتب حسم"
    ],
    
    /**
     * طرق التسليم المتاحة
     */
    deliveryMethods: [
      "باليد",
      "بريد أردني",
      "Aramex",
      "DHL"
    ],
    
    /**
     * طرق الشحن التي تتطلب رقم تتبع
     */
    shippingMethods: [
      "بريد أردني",
      "Aramex",
      "DHL"
    ]
  },
  
  /**
   * إعدادات واجهة المستخدم
   */
  ui: {
    /**
     * تأخير عرض مؤشر التحميل (بالمللي ثانية)
     */
    loaderDelay: 300,
    
    /**
     * مدة ظهور الإشعارات (بالمللي ثانية)
     */
    notificationDuration: 5000,
    
    /**
     * عدد العناصر في الصفحة الواحدة للجداول
     */
    tablePageSize: 10
  }
};

// تصدير الإعدادات للاستخدام في الملفات الأخرى
export default ArcheefConfig;