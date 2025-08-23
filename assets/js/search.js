/**
 * إدارة البحث
 * Search Management
 */

class SearchManager {
    constructor() {
        this.searchTimeout = null;
        this.lastSearchQuery = '';
        this.searchResults = [];
    }

    /**
     * تهيئة مدير البحث
     */
    initialize() {
        this.setupEventListeners();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // البحث أثناء الكتابة مع تأخير
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            // البحث عند الضغط على Enter
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value);
                }
            });
        }
    }

    /**
     * معالجة إدخال البحث
     */
    handleSearchInput(query) {
        // إلغاء البحث السابق
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // تأخير البحث لتحسين الأداء
        this.searchTimeout = setTimeout(() => {
            if (query.trim().length >= APP_CONFIG.search.minSearchLength) {
                this.performSearch(query.trim());
            } else {
                this.clearSearchResults();
            }
        }, APP_CONFIG.search.searchDelay);
    }

    /**
     * تنفيذ البحث
     */
    async performSearch(query = null) {
        try {
            const searchQuery = query || document.getElementById('searchInput')?.value?.trim();
            
            if (!searchQuery) {
                showAlert('يرجى إدخال رقم العقد للبحث', 'warning');
                return;
            }

            if (searchQuery.length < APP_CONFIG.search.minSearchLength) {
                showAlert(`يجب أن يكون البحث ${APP_CONFIG.search.minSearchLength} أحرف على الأقل`, 'warning');
                return;
            }

            showLoading(true);
            this.lastSearchQuery = searchQuery;

            // البحث في قاعدة البيانات
            const contract = await db.searchContract(searchQuery);
            
            if (contract) {
                this.displaySearchResults([contract]);
                showAlert(MESSAGES.success.contractFound, 'success');
            } else {
                this.displaySearchResults([]);
                showAlert(MESSAGES.error.contractNotFound, 'warning');
            }

        } catch (error) {
            console.error('خطأ في البحث:', error);
            showAlert(MESSAGES.error.databaseError, 'error');
            this.displaySearchResults([]);
        } finally {
            showLoading(false);
        }
    }

    /**
     * عرض نتائج البحث
     */
    displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        this.searchResults = results;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="result-item" style="text-align: center; color: var(--gray-500);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h3>لا توجد نتائج</h3>
                    <p>لم يتم العثور على عقد بالرقم "${escapeHtml(this.lastSearchQuery)}"</p>
                    <p style="font-size: 0.9rem; margin-top: 1rem;">
                        تأكد من صحة رقم العقد أو جرب البحث بطريقة أخرى
                    </p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = results.map(contract => this.createContractCard(contract)).join('');
        }

        resultsContainer.style.display = 'block';
    }

    /**
     * إنشاء بطاقة العقد
     */
    createContractCard(contract) {
        const statusClass = this.getContractStatusClass(contract);
        const statusIcon = this.getContractStatusIcon(contract);
        const departmentColor = contract.current_holder?.department === 'مكتب' ? 'var(--warning-color)' : 'var(--success-color)';
        
        return `
            <div class="result-item">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        📄 عقد رقم: ${escapeHtml(contract.contract_number)}
                    </h3>
                    <span class="status-badge ${statusClass}" style="flex-shrink: 0;">
                        ${statusIcon} ${contract.current_holder?.department === 'مكتب' ? 'في المكتب' : 'في الأرشيف'}
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <p><strong>الحالة:</strong></p>
                        <p style="color: ${departmentColor};">${contract.status || 'غير محدد'}</p>
                    </div>
                    <div>
                        <p><strong>الموظف الحالي:</strong></p>
                        <p>${contract.current_holder?.name || 'غير محدد'}</p>
                    </div>
                    <div>
                        <p><strong>القسم:</strong></p>
                        <p style="color: ${departmentColor};">${contract.current_holder?.department || 'غير محدد'}</p>
                    </div>
                    <div>
                        <p><strong>تاريخ التحديث:</strong></p>
                        <p>${formatDate(contract.updated_at)}</p>
                    </div>
                </div>

                ${contract.lastTransaction ? `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-md); border-right: 4px solid var(--info-color);">
                        <h4 style="margin: 0 0 0.5rem 0; color: var(--info-color); display: flex; align-items: center; gap: 0.5rem;">
                            🔄 آخر حركة
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.9rem;">
                            <p><strong>النوع:</strong> ${contract.lastTransaction.transaction_type}</p>
                            <p><strong>التاريخ:</strong> ${formatDate(contract.lastTransaction.transaction_date)}</p>
                            <p><strong>من:</strong> ${contract.lastTransaction.from_employee?.name || '-'}</p>
                            <p><strong>إلى:</strong> ${contract.lastTransaction.to_employee?.name || '-'}</p>
                        </div>
                    </div>
                ` : `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-md); text-align: center; color: var(--gray-500);">
                        <p style="margin: 0;">لا توجد حركات مسجلة لهذا العقد</p>
                    </div>
                `}

                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                            onclick="searchManager.copyContractInfo('${contract.contract_number}')">
                        📋 نسخ المعلومات
                    </button>
                    ${contract.lastTransaction ? `
                        <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                onclick="searchManager.showContractHistory('${contract.id}')">
                            📜 عرض السجل
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * الحصول على فئة حالة العقد
     */
    getContractStatusClass(contract) {
        if (!contract.current_holder) return 'status-pending';
        return contract.current_holder.department === 'مكتب' ? 'status-busy' : 'status-available';
    }

    /**
     * الحصول على أيقونة حالة العقد
     */
    getContractStatusIcon(contract) {
        if (!contract.current_holder) return '❓';
        return contract.current_holder.department === 'مكتب' ? '📂' : '📦';
    }

    /**
     * مسح نتائج البحث
     */
    clearSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        this.searchResults = [];
    }

    /**
     * عرض جميع العقود
     */
    async showAllContracts() {
        try {
            showLoading(true);

            const contracts = await db.getAllContracts();
            this.displayAllContracts(contracts);

        } catch (error) {
            console.error('خطأ في جلب جميع العقود:', error);
            showAlert(MESSAGES.error.databaseError, 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * عرض جميع العقود في جدول
     */
    displayAllContracts(contracts) {
        const container = document.getElementById('allContracts');
        if (!container) return;

        if (contracts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <h3>لا توجد عقود مسجلة</h3>
                    <p>لم يتم تسجيل أي عقود في النظام بعد</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="table-container">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 1rem;">
                        <h3 style="margin: 0;">جميع العقود (${formatNumber(contracts.length)})</h3>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                    onclick="searchManager.exportContracts('csv')">
                                📊 تصدير CSV
                            </button>
                            <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.875rem;" 
                                    onclick="searchManager.exportContracts('json')">
                                📄 تصدير JSON
                            </button>
                        </div>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>رقم العقد</th>
                                <th>الحالة</th>
                                <th>الموظف الحالي</th>
                                <th>القسم</th>
                                <th>تاريخ الإنشاء</th>
                                <th>تاريخ التحديث</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${contracts.map(contract => this.createContractTableRow(contract)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        container.style.display = 'block';
    }

    /**
     * إنشاء صف جدول العقد
     */
    createContractTableRow(contract) {
        const statusClass = this.getContractStatusClass(contract);
        const statusIcon = this.getContractStatusIcon(contract);
        
        return `
            <tr>
                <td>
                    <code style="background: var(--gray-100); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm);">
                        ${escapeHtml(contract.contract_number)}
                    </code>
                </td>
                <td>${contract.status || 'غير محدد'}</td>
                <td>${contract.current_holder?.name || 'غير محدد'}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusIcon} ${contract.current_holder?.department || 'غير محدد'}
                    </span>
                </td>
                <td>${formatDateOnly(contract.created_at)}</td>
                <td>${formatDate(contract.updated_at)}</td>
                <td>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                onclick="searchManager.searchSpecificContract('${contract.contract_number}')" 
                                title="عرض التفاصيل">
                            👁️
                        </button>
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                onclick="searchManager.copyContractInfo('${contract.contract_number}')" 
                                title="نسخ المعلومات">
                            📋
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * البحث عن عقد محدد
     */
    async searchSpecificContract(contractNumber) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = contractNumber;
        }
        await this.performSearch(contractNumber);
        
        // التمرير إلى نتائج البحث
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * نسخ معلومات العقد
     */
    async copyContractInfo(contractNumber) {
        try {
            const contract = await db.searchContract(contractNumber);
            if (!contract) {
                showAlert('لم يتم العثور على العقد', 'error');
                return;
            }

            const info = `
رقم العقد: ${contract.contract_number}
الحالة: ${contract.status || 'غير محدد'}
الموظف الحالي: ${contract.current_holder?.name || 'غير محدد'}
القسم: ${contract.current_holder?.department || 'غير محدد'}
تاريخ التحديث: ${formatDate(contract.updated_at)}
${contract.lastTransaction ? `
آخر حركة:
- النوع: ${contract.lastTransaction.transaction_type}
- التاريخ: ${formatDate(contract.lastTransaction.transaction_date)}
- من: ${contract.lastTransaction.from_employee?.name || '-'}
- إلى: ${contract.lastTransaction.to_employee?.name || '-'}
` : ''}
            `.trim();

            const success = await copyToClipboard(info);
            if (success) {
                showAlert('تم نسخ معلومات العقد بنجاح', 'success');
            } else {
                showAlert('فشل في نسخ المعلومات', 'error');
            }

        } catch (error) {
            console.error('خطأ في نسخ معلومات العقد:', error);
            showAlert('حدث خطأ أثناء نسخ المعلومات', 'error');
        }
    }

    /**
     * عرض سجل العقد
     */
    async showContractHistory(contractId) {
        try {
            showLoading(true);

            // جلب جميع الحركات المتعلقة بهذا العقد
            const { data: contractHistory, error } = await db.supabase
                .from('transaction_details')
                .select(`
                    *,
                    transactions(
                        *,
                        from_employee:employees!from_employee_id(name),
                        to_employee:employees!to_employee_id(name)
                    )
                `)
                .eq('contract_id', contractId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.displayContractHistory(contractHistory || []);

        } catch (error) {
            console.error('خطأ في جلب سجل العقد:', error);
            showAlert('حدث خطأ في جلب سجل العقد', 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * عرض سجل العقد
     */
    displayContractHistory(history) {
        // يمكن تطوير هذه الوظيفة لعرض سجل مفصل للعقد
        console.log('سجل العقد:', history);
        showAlert('ميزة عرض السجل المفصل قيد التطوير', 'info');
    }

    /**
     * تصدير العقود
     */
    async exportContracts(format = 'json') {
        try {
            const contracts = await db.getAllContracts();
            
            if (format === 'json') {
                downloadJSON(contracts, `contracts-${formatDateOnly(new Date())}.json`);
            } else if (format === 'csv') {
                const headers = [
                    'contract_number', 'status', 'current_holder_name', 
                    'current_holder_department', 'created_at', 'updated_at'
                ];
                
                const csvData = contracts.map(contract => ({
                    contract_number: contract.contract_number,
                    status: contract.status || '',
                    current_holder_name: contract.current_holder?.name || '',
                    current_holder_department: contract.current_holder?.department || '',
                    created_at: formatDate(contract.created_at),
                    updated_at: formatDate(contract.updated_at)
                }));

                downloadCSV(csvData, headers, `contracts-${formatDateOnly(new Date())}.csv`);
            }

            showAlert('تم تصدير العقود بنجاح', 'success');

        } catch (error) {
            console.error('خطأ في تصدير العقود:', error);
            showAlert('حدث خطأ أثناء تصدير العقود', 'error');
        }
    }

    /**
     * البحث المتقدم
     */
    async advancedSearch(criteria) {
        // يمكن تطوير هذه الوظيفة للبحث المتقدم
        console.log('البحث المتقدم:', criteria);
        showAlert('ميزة البحث المتقدم قيد التطوير', 'info');
    }
}

// إنشاء مثيل واحد من مدير البحث
const searchManager = new SearchManager();

// دوال عامة للوصول السريع
async function performSearch() {
    await searchManager.performSearch();
}

async function showAllContracts() {
    await searchManager.showAllContracts();
}