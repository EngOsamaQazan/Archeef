/**
 * إدارة التقارير
 * Reports Management
 */

class ReportsManager {
    constructor() {
        this.currentPeriod = 'today';
        this.currentReportData = null;
        this.chartInstances = new Map();
    }

    /**
     * تهيئة مدير التقارير
     */
    initialize() {
        this.setupEventListeners();
        this.loadInitialReport();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.generateReport();
            });
        }
    }

    /**
     * تحميل التقرير الأولي
     */
    async loadInitialReport() {
        if (ui.currentTab === 'reports') {
            await this.generateReport();
        }
    }

    /**
     * إنشاء التقرير
     */
    async generateReport(period = null) {
        try {
            const reportPeriod = period || this.currentPeriod;
            showLoading(true);

            // جلب بيانات التقرير
            const transactions = await db.getTransactionsByPeriod(reportPeriod);
            const statistics = await this.calculateStatistics(transactions);
            
            this.currentReportData = {
                period: reportPeriod,
                transactions,
                statistics
            };

            // عرض التقرير
            this.displayReport();
            
            showAlert(MESSAGES.success.reportGenerated, 'success');

        } catch (error) {
            console.error('خطأ في إنشاء التقرير:', error);
            showAlert(MESSAGES.error.databaseError, 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * حساب الإحصائيات
     */
    async calculateStatistics(transactions) {
        const stats = {
            total: transactions.length,
            استلام: transactions.filter(t => t.transaction_type === 'استلام').length,
            تسليم: transactions.filter(t => t.transaction_type === 'تسليم').length,
            totalContracts: 0,
            employeeStats: new Map(),
            dailyStats: new Map(),
            departmentStats: new Map()
        };

        // حساب إجمالي العقود
        transactions.forEach(transaction => {
            const contractCount = transaction.transaction_details?.[0]?.count || 0;
            stats.totalContracts += contractCount;

            // إحصائيات الموظفين
            const fromEmployee = transaction.from_employee?.name;
            const toEmployee = transaction.to_employee?.name;

            if (fromEmployee) {
                if (!stats.employeeStats.has(fromEmployee)) {
                    stats.employeeStats.set(fromEmployee, { sent: 0, received: 0 });
                }
                stats.employeeStats.get(fromEmployee).sent += contractCount;
            }

            if (toEmployee) {
                if (!stats.employeeStats.has(toEmployee)) {
                    stats.employeeStats.set(toEmployee, { sent: 0, received: 0 });
                }
                stats.employeeStats.get(toEmployee).received += contractCount;
            }

            // إحصائيات يومية
            const date = formatDateOnly(transaction.transaction_date);
            if (!stats.dailyStats.has(date)) {
                stats.dailyStats.set(date, { استلام: 0, تسليم: 0 });
            }
            stats.dailyStats.get(date)[transaction.transaction_type]++;

            // إحصائيات الأقسام
            const fromDept = transaction.from_employee?.department;
            const toDept = transaction.to_employee?.department;

            if (fromDept) {
                if (!stats.departmentStats.has(fromDept)) {
                    stats.departmentStats.set(fromDept, { sent: 0, received: 0 });
                }
                stats.departmentStats.get(fromDept).sent += contractCount;
            }

            if (toDept) {
                if (!stats.departmentStats.has(toDept)) {
                    stats.departmentStats.set(toDept, { sent: 0, received: 0 });
                }
                stats.departmentStats.get(toDept).received += contractCount;
            }
        });

        return stats;
    }

    /**
     * عرض التقرير
     */
    displayReport() {
        const reportContent = document.getElementById('reportContent');
        if (!reportContent || !this.currentReportData) return;

        const { period, transactions, statistics } = this.currentReportData;
        const periodLabel = this.getPeriodLabel(period);

        reportContent.innerHTML = `
            <div class="report-container">
                <!-- رأس التقرير -->
                <div class="report-header" style="text-align: center; margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, var(--primary-color), var(--primary-light)); color: white; border-radius: var(--radius-xl);">
                    <h2 style="margin: 0 0 0.5rem 0; font-size: 2rem;">📊 تقرير الحركات</h2>
                    <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">الفترة: ${periodLabel}</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; opacity: 0.8;">تم إنشاؤه في: ${formatDate(new Date())}</p>
                </div>

                <!-- الإحصائيات السريعة -->
                <div class="report-stats" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">📈 الإحصائيات السريعة</h3>
                    <div class="stats-grid">
                        <div class="stat-card primary">
                            <div class="stat-icon">📄</div>
                            <div class="stat-info">
                                <div class="stat-number">${formatNumber(statistics.total)}</div>
                                <div class="stat-label">إجمالي الحركات</div>
                            </div>
                        </div>
                        <div class="stat-card success">
                            <div class="stat-icon">📥</div>
                            <div class="stat-info">
                                <div class="stat-number">${formatNumber(statistics.استلام)}</div>
                                <div class="stat-label">عمليات الاستلام</div>
                            </div>
                        </div>
                        <div class="stat-card warning">
                            <div class="stat-icon">📤</div>
                            <div class="stat-info">
                                <div class="stat-number">${formatNumber(statistics.تسليم)}</div>
                                <div class="stat-label">عمليات التسليم</div>
                            </div>
                        </div>
                        <div class="stat-card info">
                            <div class="stat-icon">📋</div>
                            <div class="stat-info">
                                <div class="stat-number">${formatNumber(statistics.totalContracts)}</div>
                                <div class="stat-label">إجمالي العقود</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- إحصائيات الموظفين -->
                ${this.generateEmployeeStatsSection(statistics.employeeStats)}

                <!-- إحصائيات الأقسام -->
                ${this.generateDepartmentStatsSection(statistics.departmentStats)}

                <!-- جدول الحركات التفصيلي -->
                ${this.generateTransactionsTable(transactions)}

                <!-- أزرار التصدير -->
                <div class="report-actions" style="margin-top: 2rem; text-align: center; padding-top: 1rem; border-top: 1px solid var(--gray-200);">
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="reportsManager.exportReport('pdf')">
                            <span class="btn-icon">📄</span>
                            تصدير PDF
                        </button>
                        <button class="btn btn-success" onclick="reportsManager.exportReport('excel')">
                            <span class="btn-icon">📊</span>
                            تصدير Excel
                        </button>
                        <button class="btn btn-secondary" onclick="reportsManager.exportReport('json')">
                            <span class="btn-icon">💾</span>
                            تصدير JSON
                        </button>
                        <button class="btn btn-outline" onclick="reportsManager.printReport()">
                            <span class="btn-icon">🖨️</span>
                            طباعة التقرير
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * إنشاء قسم إحصائيات الموظفين
     */
    generateEmployeeStatsSection(employeeStats) {
        if (employeeStats.size === 0) {
            return `
                <div style="margin-bottom: 2rem; text-align: center; color: var(--gray-500);">
                    <p>لا توجد إحصائيات موظفين للفترة المحددة</p>
                </div>
            `;
        }

        const employeeRows = Array.from(employeeStats.entries())
            .sort((a, b) => (b[1].sent + b[1].received) - (a[1].sent + a[1].received))
            .map(([name, stats]) => `
                <tr>
                    <td>${escapeHtml(name)}</td>
                    <td style="text-align: center;">${formatNumber(stats.sent)}</td>
                    <td style="text-align: center;">${formatNumber(stats.received)}</td>
                    <td style="text-align: center; font-weight: 600;">${formatNumber(stats.sent + stats.received)}</td>
                </tr>
            `).join('');

        return `
            <div class="employee-stats" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">👥 إحصائيات الموظفين</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>اسم الموظف</th>
                                <th style="text-align: center;">العقود المُسلّمة</th>
                                <th style="text-align: center;">العقود المُستلمة</th>
                                <th style="text-align: center;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${employeeRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * إنشاء قسم إحصائيات الأقسام
     */
    generateDepartmentStatsSection(departmentStats) {
        if (departmentStats.size === 0) {
            return `
                <div style="margin-bottom: 2rem; text-align: center; color: var(--gray-500);">
                    <p>لا توجد إحصائيات أقسام للفترة المحددة</p>
                </div>
            `;
        }

        const departmentRows = Array.from(departmentStats.entries())
            .map(([dept, stats]) => {
                const deptIcon = dept === 'مكتب' ? '🏢' : '📦';
                const deptColor = dept === 'مكتب' ? 'var(--warning-color)' : 'var(--success-color)';
                
                return `
                    <tr>
                        <td>
                            <span style="color: ${deptColor};">${deptIcon} ${escapeHtml(dept)}</span>
                        </td>
                        <td style="text-align: center;">${formatNumber(stats.sent)}</td>
                        <td style="text-align: center;">${formatNumber(stats.received)}</td>
                        <td style="text-align: center; font-weight: 600;">${formatNumber(stats.sent + stats.received)}</td>
                    </tr>
                `;
            }).join('');

        return `
            <div class="department-stats" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">🏛️ إحصائيات الأقسام</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>القسم</th>
                                <th style="text-align: center;">العقود المُسلّمة</th>
                                <th style="text-align: center;">العقود المُستلمة</th>
                                <th style="text-align: center;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${departmentRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * إنشاء جدول الحركات التفصيلي
     */
    generateTransactionsTable(transactions) {
        if (transactions.length === 0) {
            return `
                <div style="margin-bottom: 2rem; text-align: center; color: var(--gray-500);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <h3>لا توجد حركات</h3>
                    <p>لم يتم تسجيل أي حركات في الفترة المحددة</p>
                </div>
            `;
        }

        const transactionRows = transactions.map(transaction => {
            const contractCount = transaction.transaction_details?.[0]?.count || 0;
            const statusClass = transaction.transaction_type === 'استلام' ? 'status-available' : 'status-busy';
            const typeIcon = TRANSACTION_TYPES[transaction.transaction_type]?.icon || '📄';
            
            return `
                <tr>
                    <td>
                        <code style="background: var(--gray-100); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm);">
                            ${transaction.receipt_number}
                        </code>
                    </td>
                    <td>${formatDate(transaction.transaction_date)}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${typeIcon} ${transaction.transaction_type}
                        </span>
                    </td>
                    <td>${transaction.from_employee?.name || '-'}</td>
                    <td>${transaction.to_employee?.name || '-'}</td>
                    <td style="text-align: center; font-weight: 600;">${formatNumber(contractCount)}</td>
                    <td>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                onclick="viewTransactionDetails('${transaction.id}')" 
                                title="عرض التفاصيل">
                            👁️ تفاصيل
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="transactions-table" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">📋 تفاصيل الحركات (${formatNumber(transactions.length)})</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>رقم الإيصال</th>
                                <th>التاريخ</th>
                                <th>النوع</th>
                                <th>من</th>
                                <th>إلى</th>
                                <th style="text-align: center;">عدد العقود</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * الحصول على تسمية الفترة
     */
    getPeriodLabel(period) {
        const labels = {
            today: 'اليوم',
            week: 'هذا الأسبوع',
            month: 'هذا الشهر',
            all: 'جميع الفترات'
        };
        return labels[period] || 'غير محدد';
    }

    /**
     * إنشاء تقرير اليوم
     */
    async generateTodayReport() {
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            reportPeriod.value = 'today';
        }
        
        this.currentPeriod = 'today';
        await this.generateReport('today');
        
        // التبديل إلى تبويب التقارير
        ui.switchTab('reports');
    }

    /**
     * تصدير التقرير
     */
    async exportReport(format = 'json') {
        try {
            if (!this.currentReportData) {
                showAlert('لا يوجد تقرير لتصديره، يرجى إنشاء تقرير أولاً', 'warning');
                return;
            }

            const { period, transactions, statistics } = this.currentReportData;
            const filename = `report-${period}-${formatDateOnly(new Date())}`;

            switch (format) {
                case 'json':
                    downloadJSON(this.currentReportData, `${filename}.json`);
                    break;
                    
                case 'csv':
                    await this.exportReportAsCSV(transactions, filename);
                    break;
                    
                case 'excel':
                    showAlert('تصدير Excel قيد التطوير', 'info');
                    break;
                    
                case 'pdf':
                    showAlert('تصدير PDF قيد التطوير', 'info');
                    break;
                    
                default:
                    showAlert('تنسيق التصدير غير مدعوم', 'error');
                    return;
            }

            showAlert('تم تصدير التقرير بنجاح', 'success');

        } catch (error) {
            console.error('خطأ في تصدير التقرير:', error);
            showAlert('حدث خطأ أثناء تصدير التقرير', 'error');
        }
    }

    /**
     * تصدير التقرير كـ CSV
     */
    async exportReportAsCSV(transactions, filename) {
        const headers = [
            'receipt_number', 'transaction_date', 'transaction_type',
            'from_employee', 'to_employee', 'contract_count', 'notes'
        ];
        
        const csvData = transactions.map(transaction => ({
            receipt_number: transaction.receipt_number,
            transaction_date: formatDate(transaction.transaction_date),
            transaction_type: transaction.transaction_type,
            from_employee: transaction.from_employee?.name || '',
            to_employee: transaction.to_employee?.name || '',
            contract_count: transaction.transaction_details?.[0]?.count || 0,
            notes: transaction.notes || ''
        }));

        downloadCSV(csvData, headers, `${filename}.csv`);
    }

    /**
     * طباعة التقرير
     */
    printReport() {
        try {
            // إخفاء العناصر غير المطلوبة للطباعة
            const noprint = document.querySelectorAll('.no-print, .app-header, .app-nav');
            noprint.forEach(element => {
                element.style.display = 'none';
            });

            // إضافة أنماط الطباعة
            const printStyles = document.createElement('style');
            printStyles.textContent = `
                @media print {
                    body { font-size: 12px; }
                    .report-container { max-width: 100%; }
                    .stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .data-table { font-size: 10px; }
                    .data-table th, .data-table td { padding: 0.5rem; }
                }
            `;
            document.head.appendChild(printStyles);

            // طباعة الصفحة
            window.print();

            // إعادة إظهار العناصر وإزالة الأنماط
            setTimeout(() => {
                noprint.forEach(element => {
                    element.style.display = '';
                });
                document.head.removeChild(printStyles);
            }, 1000);

        } catch (error) {
            console.error('خطأ في طباعة التقرير:', error);
            showAlert('حدث خطأ أثناء طباعة التقرير', 'error');
        }
    }

    /**
     * إنشاء تقرير مخصص
     */
    async generateCustomReport(criteria) {
        // يمكن تطوير هذه الوظيفة لإنشاء تقارير مخصصة
        console.log('تقرير مخصص:', criteria);
        showAlert('ميزة التقارير المخصصة قيد التطوير', 'info');
    }

    /**
     * مقارنة الفترات
     */
    async comparePeriods(period1, period2) {
        // يمكن تطوير هذه الوظيفة لمقارنة فترتين
        console.log('مقارنة الفترات:', period1, period2);
        showAlert('ميزة مقارنة الفترات قيد التطوير', 'info');
    }
}

// إنشاء مثيل واحد من مدير التقارير
const reportsManager = new ReportsManager();

// دوال عامة للوصول السريع
async function generateReport() {
    await reportsManager.generateReport();
}

async function generateTodayReport() {
    await reportsManager.generateTodayReport();
}