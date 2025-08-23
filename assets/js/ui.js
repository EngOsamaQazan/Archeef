/**
 * إدارة واجهة المستخدم
 * User Interface Management
 */

class UIManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.isLoading = false;
        this.alerts = new Map();
        this.alertCounter = 0;
    }

    /**
     * تهيئة واجهة المستخدم
     */
    initialize() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupResponsiveHandlers();
        this.hideLoadingScreen();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // التنقل بين التبويبات
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // إغلاق النوافذ المنبثقة بالضغط على الخلفية
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });

        // إغلاق النوافذ المنبثقة بمفتاح Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // تحديث الإحصائيات في الرأس
        this.setupAutoRefresh();
    }

    /**
     * إعداد اختصارات لوحة المفاتيح
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + رقم للتنقل بين التبويبات
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const tabs = ['dashboard', 'transaction', 'search', 'reports', 'history'];
                const tabIndex = parseInt(e.key) - 1;
                if (tabs[tabIndex]) {
                    this.switchTab(tabs[tabIndex]);
                }
            }

            // Ctrl/Cmd + S لحفظ النموذج
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.currentTab === 'transaction') {
                    document.getElementById('transactionForm')?.dispatchEvent(new Event('submit'));
                }
            }

            // Ctrl/Cmd + F للبحث
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.switchTab('search');
                setTimeout(() => {
                    document.getElementById('searchInput')?.focus();
                }, 100);
            }
        });
    }

    /**
     * إعداد معالجات الاستجابة
     */
    setupResponsiveHandlers() {
        // تحديث التخطيط عند تغيير حجم الشاشة
        window.addEventListener('resize', () => {
            this.updateLayout();
        });

        // تحديث التخطيط عند تغيير الاتجاه
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateLayout();
            }, 100);
        });
    }

    /**
     * إعداد التحديث التلقائي
     */
    setupAutoRefresh() {
        setInterval(() => {
            if (this.currentTab === 'dashboard') {
                this.updateHeaderStats();
            }
        }, APP_CONFIG.ui.autoRefreshInterval);
    }

    /**
     * إخفاء شاشة التحميل
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const appContainer = document.getElementById('appContainer');
        
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            appContainer.classList.add('loaded');
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, APP_CONFIG.ui.animationDuration);
        }, APP_CONFIG.ui.loadingDelay);
    }

    /**
     * التبديل بين التبويبات
     */
    switchTab(tabName) {
        // إخفاء جميع التبويبات
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // إزالة التفعيل من جميع أزرار التنقل
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // عرض التبويب المحدد
        const targetTab = document.getElementById(tabName);
        const targetNavItem = document.querySelector(`[data-tab="${tabName}"]`);

        if (targetTab && targetNavItem) {
            targetTab.classList.add('active');
            targetNavItem.classList.add('active');
            this.currentTab = tabName;

            // تحميل البيانات حسب التبويب
            this.loadTabData(tabName);
        }
    }

    /**
     * تحميل بيانات التبويب
     */
    async loadTabData(tabName) {
        try {
            switch (tabName) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'transaction':
                    await this.loadTransactionData();
                    break;
                case 'reports':
                    await this.loadReportsData();
                    break;
                case 'history':
                    await this.loadHistoryData();
                    break;
            }
        } catch (error) {
            console.error(`خطأ في تحميل بيانات التبويب ${tabName}:`, error);
            this.showAlert(MESSAGES.error.databaseError, 'error');
        }
    }

    /**
     * تحميل بيانات لوحة التحكم
     */
    async loadDashboardData() {
        try {
            const stats = await db.getStatistics();
            this.updateStatistics(stats);

            const recentActivity = await db.getRecentActivity(5);
            this.updateRecentActivity(recentActivity);

            // تحديث اسم المستخدم في الرأس
            this.updateUserInfo();
        } catch (error) {
            console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
        }
    }

    /**
     * تحديث معلومات المستخدم
     */
    updateUserInfo() {
        const userNameElement = document.getElementById('currentUserName');
        if (userNameElement && authManager.isAuthenticated) {
            const userInfo = authManager.getCurrentUser();
            userNameElement.textContent = userInfo.employee?.name || 'المستخدم';
        }
    }

    /**
     * تحميل بيانات نموذج الحركة
     */
    async loadTransactionData() {
        try {
            const employees = await db.getEmployees();
            this.updateEmployeeSelects(employees);
        } catch (error) {
            console.error('خطأ في تحميل بيانات الموظفين:', error);
        }
    }

    /**
     * تحميل بيانات التقارير
     */
    async loadReportsData() {
        try {
            const stats = await db.getStatistics();
            this.updateStatistics(stats);
        } catch (error) {
            console.error('خطأ في تحميل بيانات التقارير:', error);
        }
    }

    /**
     * تحميل بيانات السجل
     */
    async loadHistoryData() {
        try {
            const transactions = await db.getFilteredTransactions('all');
            this.updateHistoryTable(transactions);
        } catch (error) {
            console.error('خطأ في تحميل بيانات السجل:', error);
        }
    }

    /**
     * تحديث الإحصائيات
     */
    updateStatistics(stats) {
        // تحديث الإحصائيات في لوحة التحكم
        const elements = {
            totalContracts: document.getElementById('totalContracts'),
            totalTransactions: document.getElementById('totalTransactions'),
            todayTransactions: document.getElementById('todayTransactions'),
            activeEmployees: document.getElementById('activeEmployees')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                elements[key].textContent = formatNumber(stats[key] || 0);
            }
        });

        // تحديث الإحصائيات في الرأس
        this.updateHeaderStats(stats);
    }

    /**
     * تحديث إحصائيات الرأس
     */
    updateHeaderStats(stats = null) {
        if (!stats) {
            db.getStatistics().then(data => {
                this.updateHeaderStats(data);
            }).catch(error => {
                console.error('خطأ في تحديث إحصائيات الرأس:', error);
            });
            return;
        }

        const headerTotalContracts = document.getElementById('headerTotalContracts');
        const headerTodayTransactions = document.getElementById('headerTodayTransactions');

        if (headerTotalContracts) {
            headerTotalContracts.textContent = formatNumber(stats.totalContracts || 0);
        }

        if (headerTodayTransactions) {
            headerTodayTransactions.textContent = formatNumber(stats.todayTransactions || 0);
        }
    }

    /**
     * تحديث النشاط الأخير
     */
    updateRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">📭</div>
                    <div class="activity-content">
                        <div class="activity-title">لا يوجد نشاط حديث</div>
                        <div class="activity-description">لم يتم تسجيل أي حركات بعد</div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => {
            const icon = TRANSACTION_TYPES[activity.transaction_type]?.icon || '📄';
            const contractCount = activity.transaction_details?.[0]?.count || 0;
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">
                            ${activity.transaction_type} - ${contractCount} عقد
                        </div>
                        <div class="activity-description">
                            من ${activity.from_employee?.name} إلى ${activity.to_employee?.name}
                        </div>
                    </div>
                    <div class="activity-time">
                        ${formatDate(activity.transaction_date)}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * تحديث قوائم الموظفين
     */
    updateEmployeeSelects(employees = null) {
        const transactionType = document.getElementById('transactionType')?.value;
        const fromSelect = document.getElementById('fromEmployee');
        const toSelect = document.getElementById('toEmployee');

        if (!fromSelect || !toSelect) return;

        // مسح القوائم الحالية
        fromSelect.innerHTML = '<option value="">اختر الموظف المُسلِّم</option>';
        toSelect.innerHTML = '<option value="">اختر الموظف المُستلِم</option>';

        // استخدام البيانات الافتراضية إذا لم تتوفر بيانات من قاعدة البيانات
        const employeeData = employees || this.getDefaultEmployees();

        if (transactionType === 'استلام') {
            // استلام من الأرشيف: المُسلِّم من الأرشيف، المُستلِم من المكتب
            this.populateEmployeeSelect(fromSelect, employeeData, 'أرشيف');
            this.populateEmployeeSelect(toSelect, employeeData, 'مكتب');
        } else if (transactionType === 'تسليم') {
            // تسليم إلى الأرشيف: المُسلِّم من المكتب، المُستلِم من الأرشيف
            this.populateEmployeeSelect(fromSelect, employeeData, 'مكتب');
            this.populateEmployeeSelect(toSelect, employeeData, 'أرشيف');
        }
    }

    /**
     * الحصول على الموظفين الافتراضيين
     */
    getDefaultEmployees() {
        const employees = [];
        Object.keys(DEFAULT_EMPLOYEES).forEach(department => {
            DEFAULT_EMPLOYEES[department].forEach(name => {
                employees.push({ name, department });
            });
        });
        return employees;
    }

    /**
     * ملء قائمة الموظفين
     */
    populateEmployeeSelect(selectElement, employees, department) {
        const filteredEmployees = employees.filter(emp => emp.department === department);
        
        filteredEmployees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.name;
            option.textContent = employee.name;
            selectElement.appendChild(option);
        });
    }

    /**
     * تحديث جدول السجل
     */
    updateHistoryTable(transactions) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--gray-500);">
                        لا توجد حركات مسجلة
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(transaction => {
            const contractCount = transaction.transaction_details?.length || 0;
            const statusClass = transaction.transaction_type === 'استلام' ? 'status-available' : 'status-busy';
            
            return `
                <tr>
                    <td>${transaction.receipt_number}</td>
                    <td>${formatDate(transaction.transaction_date)}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${transaction.transaction_type}
                        </span>
                    </td>
                    <td>${transaction.from_employee?.name || '-'}</td>
                    <td>${transaction.to_employee?.name || '-'}</td>
                    <td>${formatNumber(contractCount)}</td>
                    <td>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;" 
                                onclick="viewTransactionDetails('${transaction.id}')">
                            عرض التفاصيل
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * عرض تنبيه
     */
    showAlert(message, type = 'info', duration = null) {
        const alertId = `alert-${++this.alertCounter}`;
        const alertDuration = duration || APP_CONFIG.ui.toastDuration;
        
        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert alert-${type}`;
        
        const icon = this.getAlertIcon(type);
        
        alertElement.innerHTML = `
            <span class="alert-icon">${icon}</span>
            <span class="alert-message">${escapeHtml(message)}</span>
            <button class="alert-close" onclick="ui.closeAlert('${alertId}')">&times;</button>
        `;

        const container = document.getElementById('alertContainer');
        if (container) {
            container.appendChild(alertElement);
            
            // إزالة التنبيه تلقائياً
            setTimeout(() => {
                this.closeAlert(alertId);
            }, alertDuration);
        }

        this.alerts.set(alertId, alertElement);
        return alertId;
    }

    /**
     * الحصول على أيقونة التنبيه
     */
    getAlertIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * إغلاق تنبيه
     */
    closeAlert(alertId) {
        const alertElement = this.alerts.get(alertId);
        if (alertElement) {
            alertElement.style.animation = 'slideOutUp 0.3s ease-in-out';
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.parentNode.removeChild(alertElement);
                }
                this.alerts.delete(alertId);
            }, 300);
        }
    }

    /**
     * عرض/إخفاء مؤشر التحميل
     */
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('active');
                this.isLoading = true;
            } else {
                overlay.classList.remove('active');
                this.isLoading = false;
            }
        }
    }

    /**
     * عرض النافذة المنبثقة
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * إغلاق النافذة المنبثقة
     */
    closeModal() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    /**
     * تحديث التخطيط
     */
    updateLayout() {
        const deviceType = getDeviceType();
        document.body.setAttribute('data-device', deviceType);
        
        // تحديث التخطيط حسب نوع الجهاز
        if (deviceType === 'mobile') {
            this.optimizeForMobile();
        } else {
            this.optimizeForDesktop();
        }
    }

    /**
     * تحسين العرض للهواتف المحمولة
     */
    optimizeForMobile() {
        // تحسينات خاصة بالهواتف المحمولة
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            if (!table.parentElement.classList.contains('table-container')) {
                const container = document.createElement('div');
                container.className = 'table-container';
                table.parentNode.insertBefore(container, table);
                container.appendChild(table);
            }
        });
    }

    /**
     * تحسين العرض لأجهزة سطح المكتب
     */
    optimizeForDesktop() {
        // تحسينات خاصة بأجهزة سطح المكتب
    }

    /**
     * مسح نموذج الحركة
     */
    clearTransactionForm() {
        const form = document.getElementById('transactionForm');
        if (form) {
            form.reset();
            this.updateEmployeeSelects();
            this.showAlert(MESSAGES.success.formCleared, 'success');
        }
    }

    /**
     * التحقق من صحة النموذج
     */
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });

        if (!isValid) {
            this.showAlert(MESSAGES.error.requiredFields, 'error');
        }

        return isValid;
    }
}

// إنشاء مثيل واحد من مدير واجهة المستخدم
const ui = new UIManager();

// دوال عامة للوصول السريع
function switchTab(tabName) {
    ui.switchTab(tabName);
}

function showAlert(message, type = 'info') {
    return ui.showAlert(message, type);
}

function showLoading(show = true) {
    ui.showLoading(show);
}

function closeModal() {
    ui.closeModal();
}

function clearTransactionForm() {
    ui.clearTransactionForm();
}