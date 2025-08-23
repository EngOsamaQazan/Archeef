/**
 * التطبيق الرئيسي
 * Main Application
 */

class DocumentManagementApp {
    constructor() {
        this.isInitialized = false;
        this.isAuthRequired = true;
        this.managers = {
            ui: ui,
            db: db,
            auth: authManager,
            transaction: transactionManager,
            search: searchManager,
            reports: reportsManager
        };
    }

    /**
     * تهيئة التطبيق
     */
    async initialize() {
        try {
            console.log('🚀 بدء تهيئة التطبيق...');

            // تهيئة قاعدة البيانات أولاً
            const dbConnected = await this.managers.db.initialize();
            if (!dbConnected) {
                throw new Error('فشل في الاتصال بقاعدة البيانات');
            }

            // تهيئة نظام المصادقة بعد قاعدة البيانات
            if (this.isAuthRequired) {
                await this.managers.auth.initialize();
                
                // التحقق من المصادقة قبل المتابعة
                if (!this.managers.auth.isAuthenticated) {
                    return; // سيتم عرض نموذج تسجيل الدخول
                }
            }

            // تهيئة واجهة المستخدم
            this.managers.ui.initialize();

            // تهيئة المدراء الآخرين
            this.managers.transaction.initialize();
            this.managers.search.initialize();
            this.managers.reports.initialize();

            // إعداد معالجات الأخطاء العامة
            this.setupErrorHandlers();

            // إعداد معالجات الشبكة
            this.setupNetworkHandlers();

            // تحميل البيانات الأولية
            await this.loadInitialData();

            this.isInitialized = true;
            console.log('✅ تم تهيئة التطبيق بنجاح');

            // إظهار رسالة ترحيب مع اسم المستخدم
            const userInfo = this.managers.auth.getCurrentUser();
            const welcomeMessage = userInfo.employee ? 
                `مرحباً ${userInfo.employee.name}` : 
                'مرحباً بك في نظام إدارة الوثائق';
            
            // إظهار رسالة ترحيب
            setTimeout(() => {
                showAlert(welcomeMessage, 'success');
            }, 1000);

        } catch (error) {
            console.error('❌ خطأ في تهيئة التطبيق:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * تحميل البيانات الأولية
     */
    async loadInitialData() {
        try {
            // تحميل الإحصائيات
            const stats = await this.managers.db.getStatistics();
            this.managers.ui.updateStatistics(stats);

            // تحميل النشاط الأخير
            const recentActivity = await this.managers.db.getRecentActivity(5);
            this.managers.ui.updateRecentActivity(recentActivity);

            console.log('📊 تم تحميل البيانات الأولية');

        } catch (error) {
            console.warn('⚠️ خطأ في تحميل البيانات الأولية:', error);
            // لا نوقف التطبيق في حالة فشل تحميل البيانات الأولية
        }
    }

    /**
     * إعداد معالجات الأخطاء العامة
     */
    setupErrorHandlers() {
        // معالج الأخطاء العامة
        window.addEventListener('error', (event) => {
            console.error('خطأ عام في التطبيق:', event.error);
            this.handleGlobalError(event.error);
        });

        // معالج الأخطاء غير المعالجة في الوعود
        window.addEventListener('unhandledrejection', (event) => {
            console.error('وعد مرفوض غير معالج:', event.reason);
            this.handleGlobalError(event.reason);
            event.preventDefault();
        });
    }

    /**
     * إعداد معالجات الشبكة
     */
    setupNetworkHandlers() {
        // مراقبة حالة الاتصال
        window.addEventListener('online', () => {
            showAlert('تم استعادة الاتصال بالإنترنت', 'success');
            this.handleNetworkReconnection();
        });

        window.addEventListener('offline', () => {
            showAlert('انقطع الاتصال بالإنترنت', 'warning');
            this.handleNetworkDisconnection();
        });

        // فحص الاتصال الأولي
        if (!isOnline()) {
            showAlert('لا يوجد اتصال بالإنترنت', 'warning');
        }
    }

    /**
     * معالجة خطأ التهيئة
     */
    handleInitializationError(error) {
        const errorMessage = error.message || 'حدث خطأ غير متوقع أثناء تهيئة التطبيق';
        
        // إظهار رسالة خطأ للمستخدم
        document.body.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                font-family: var(--font-family);
                text-align: center;
                padding: 2rem;
            ">
                <div style="max-width: 500px;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">خطأ في تهيئة التطبيق</h1>
                    <p style="font-size: 1.1rem; margin-bottom: 2rem; opacity: 0.9;">
                        ${escapeHtml(errorMessage)}
                    </p>
                    <button onclick="location.reload()" style="
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        border: 2px solid white;
                        padding: 1rem 2rem;
                        border-radius: 0.5rem;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                       onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        🔄 إعادة تحميل الصفحة
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * معالجة الأخطاء العامة
     */
    handleGlobalError(error) {
        // تسجيل الخطأ
        console.error('خطأ عام:', error);

        // إظهار رسالة خطأ مناسبة للمستخدم
        let userMessage = 'حدث خطأ غير متوقع';
        
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                userMessage = 'خطأ في الاتصال بالشبكة';
            } else if (error.message.includes('database') || error.message.includes('supabase')) {
                userMessage = 'خطأ في قاعدة البيانات';
            }
        }

        showAlert(userMessage, 'error');
    }

    /**
     * معالجة انقطاع الشبكة
     */
    handleNetworkDisconnection() {
        // تعطيل الوظائف التي تتطلب اتصال
        const onlineOnlyButtons = document.querySelectorAll('[data-requires-online]');
        onlineOnlyButtons.forEach(button => {
            button.disabled = true;
            button.title = 'يتطلب اتصال بالإنترنت';
        });
    }

    /**
     * معالجة إعادة الاتصال بالشبكة
     */
    handleNetworkReconnection() {
        // إعادة تفعيل الوظائف
        const onlineOnlyButtons = document.querySelectorAll('[data-requires-online]');
        onlineOnlyButtons.forEach(button => {
            button.disabled = false;
            button.title = '';
        });

        // إعادة تحميل البيانات
        this.refreshData();
    }

    /**
     * تحديث البيانات
     */
    async refreshData() {
        try {
            if (this.managers.ui.currentTab === 'dashboard') {
                await this.managers.ui.loadDashboardData();
            }
        } catch (error) {
            console.error('خطأ في تحديث البيانات:', error);
        }
    }

    /**
     * إعادة تشغيل التطبيق
     */
    async restart() {
        try {
            showLoading(true);
            
            // إعادة تهيئة قاعدة البيانات
            await this.managers.db.initialize();
            
            // تحديث البيانات
            await this.loadInitialData();
            
            showAlert('تم إعادة تشغيل التطبيق بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في إعادة تشغيل التطبيق:', error);
            showAlert('فشل في إعادة تشغيل التطبيق', 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * تنظيف الموارد
     */
    cleanup() {
        // تنظيف المؤقتات
        if (this.managers.ui.autoRefreshInterval) {
            clearInterval(this.managers.ui.autoRefreshInterval);
        }

        // تنظيف مستمعي الأحداث
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handleGlobalError);
        window.removeEventListener('online', this.handleNetworkReconnection);
        window.removeEventListener('offline', this.handleNetworkDisconnection);

        console.log('🧹 تم تنظيف موارد التطبيق');
    }

    /**
     * الحصول على معلومات التطبيق
     */
    getAppInfo() {
        return {
            name: APP_CONFIG.name,
            version: APP_CONFIG.version,
            author: APP_CONFIG.author,
            isInitialized: this.isInitialized,
            currentTab: this.managers.ui.currentTab,
            isOnline: isOnline(),
            deviceType: getDeviceType()
        };
    }

    /**
     * تصدير بيانات التطبيق
     */
    async exportAppData() {
        try {
            showLoading(true);

            const [contracts, transactions, employees] = await Promise.all([
                this.managers.db.getAllContracts(),
                this.managers.db.getFilteredTransactions('all'),
                this.managers.db.getEmployees()
            ]);

            const appData = {
                exportDate: new Date().toISOString(),
                appInfo: this.getAppInfo(),
                data: {
                    contracts,
                    transactions,
                    employees
                }
            };

            downloadJSON(appData, `app-data-${formatDateOnly(new Date())}.json`);
            showAlert('تم تصدير بيانات التطبيق بنجاح', 'success');

        } catch (error) {
            console.error('خطأ في تصدير بيانات التطبيق:', error);
            showAlert('فشل في تصدير بيانات التطبيق', 'error');
        } finally {
            showLoading(false);
        }
    }
}

// إنشاء مثيل التطبيق الرئيسي
const app = new DocumentManagementApp();

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    await app.initialize();
});

// تنظيف الموارد عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    app.cleanup();
});

// تصدير التطبيق للوصول العام
window.DocumentManagementApp = app;