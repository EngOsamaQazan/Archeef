/**
 * إدارة الحركات
 * Transaction Management
 */

class TransactionManager {
    constructor() {
        this.currentTransaction = null;
        this.isSubmitting = false;
    }

    /**
     * تهيئة مدير الحركات
     */
    initialize() {
        this.setupEventListeners();
        this.loadEmployees();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // نموذج الحركة
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitTransaction();
            });
        }

        // تغيير نوع العملية
        const transactionType = document.getElementById('transactionType');
        if (transactionType) {
            transactionType.addEventListener('change', () => {
                ui.updateEmployeeSelects();
            });
        }

        // التحقق من صحة أرقام العقود أثناء الكتابة
        const contractNumbers = document.getElementById('contractNumbers');
        if (contractNumbers) {
            contractNumbers.addEventListener('input', (e) => {
                this.validateContractNumbers(e.target.value);
            });
        }
    }

    /**
     * تحميل الموظفين
     */
    async loadEmployees() {
        try {
            const employees = await db.getEmployees();
            ui.updateEmployeeSelects(employees);
        } catch (error) {
            console.error('خطأ في تحميل الموظفين:', error);
            // استخدام البيانات الافتراضية في حالة الخطأ
            ui.updateEmployeeSelects();
        }
    }

    /**
     * التحقق من صحة أرقام العقود
     */
    validateContractNumbers(contractsText) {
        const contractNumbers = parseContractNumbers(contractsText);
        const contractsInput = document.getElementById('contractNumbers');
        
        if (contractNumbers.length === 0 && contractsText.trim().length > 0) {
            contractsInput.classList.add('error');
            return false;
        } else {
            contractsInput.classList.remove('error');
            return true;
        }
    }

    /**
     * إرسال الحركة
     */
    async submitTransaction() {
        if (this.isSubmitting) return;

        try {
            // التحقق من صحة النموذج
            if (!ui.validateForm('transactionForm')) {
                return;
            }

            // جمع البيانات
            const formData = this.collectFormData();
            
            // التحقق من صحة البيانات
            if (!this.validateTransactionData(formData)) {
                return;
            }

            this.isSubmitting = true;
            showLoading(true);

            // إنشاء الحركة
            const result = await db.createTransaction(formData);
            
            showLoading(false);
            this.isSubmitting = false;

            // عرض رسالة النجاح
            showAlert(MESSAGES.success.transactionSaved, 'success');

            // عرض الإيصال
            this.showReceipt({
                receiptNumber: formData.receiptNumber,
                transactionType: formData.transactionType,
                fromEmployee: formData.fromEmployee,
                toEmployee: formData.toEmployee,
                contractNumbers: formData.contractNumbers,
                notes: formData.notes,
                date: formatDate(new Date())
            });

            // مسح النموذج
            ui.clearTransactionForm();

            // تحديث الإحصائيات
            ui.updateHeaderStats();

        } catch (error) {
            showLoading(false);
            this.isSubmitting = false;
            
            console.error('خطأ في إرسال الحركة:', error);
            showAlert(error.message || MESSAGES.error.unknownError, 'error');
        }
    }

    /**
     * جمع بيانات النموذج
     */
    collectFormData() {
        const transactionType = document.getElementById('transactionType').value;
        const fromEmployee = document.getElementById('fromEmployee').value;
        const toEmployee = document.getElementById('toEmployee').value;
        const contractsText = document.getElementById('contractNumbers').value;
        const notes = document.getElementById('notes').value;

        const contractNumbers = parseContractNumbers(contractsText);
        const receiptNumber = generateReceiptNumber();

        return {
            transactionType,
            fromEmployee,
            toEmployee,
            contractNumbers,
            notes: notes.trim() || null,
            receiptNumber
        };
    }

    /**
     * التحقق من صحة بيانات الحركة
     */
    validateTransactionData(data) {
        // التحقق من نوع العملية
        if (!data.transactionType || !TRANSACTION_TYPES[data.transactionType]) {
            showAlert('يرجى اختيار نوع العملية', 'error');
            return false;
        }

        // التحقق من الموظفين
        if (!data.fromEmployee || !data.toEmployee) {
            showAlert('يرجى اختيار الموظف المُسلِّم والمُستلِم', 'error');
            return false;
        }

        if (data.fromEmployee === data.toEmployee) {
            showAlert('لا يمكن أن يكون الموظف المُسلِّم والمُستلِم نفس الشخص', 'error');
            return false;
        }

        // التحقق من أرقام العقود
        if (!data.contractNumbers || data.contractNumbers.length === 0) {
            showAlert('يرجى إدخال رقم عقد واحد على الأقل', 'error');
            return false;
        }

        // التحقق من صحة أرقام العقود
        const invalidContracts = data.contractNumbers.filter(num => !validateContractNumber(num));
        if (invalidContracts.length > 0) {
            showAlert(`أرقام العقود التالية غير صحيحة: ${invalidContracts.join(', ')}`, 'error');
            return false;
        }

        // التحقق من تكرار أرقام العقود
        const uniqueContracts = [...new Set(data.contractNumbers)];
        if (uniqueContracts.length !== data.contractNumbers.length) {
            showAlert('يوجد أرقام عقود مكررة، يرجى إزالة التكرار', 'warning');
            return false;
        }

        return true;
    }

    /**
     * عرض الإيصال
     */
    showReceipt(receiptData) {
        const receiptContent = document.getElementById('receiptContent');
        if (!receiptContent) return;

        const transactionIcon = TRANSACTION_TYPES[receiptData.transactionType]?.icon || '📄';
        
        receiptContent.innerHTML = `
            <div class="receipt">
                <div class="receipt-header">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">${transactionIcon}</div>
                        <h2>إيصال ${receiptData.transactionType}</h2>
                        <p style="font-size: 1.2rem; margin: 1rem 0;">
                            رقم الإيصال: <strong>${receiptData.receiptNumber}</strong>
                        </p>
                        <p style="color: var(--gray-600);">التاريخ: ${receiptData.date}</p>
                    </div>
                </div>

                <div class="receipt-info">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                        <div>
                            <p><strong>نوع العملية:</strong></p>
                            <p style="font-size: 1.1rem; color: var(--primary-color);">
                                ${receiptData.transactionType}
                            </p>
                        </div>
                        <div>
                            <p><strong>عدد العقود:</strong></p>
                            <p style="font-size: 1.1rem; color: var(--primary-color);">
                                ${formatNumber(receiptData.contractNumbers.length)} عقد
                            </p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                        <div>
                            <p><strong>الموظف المُسلِّم:</strong></p>
                            <p style="font-size: 1.1rem;">${receiptData.fromEmployee}</p>
                        </div>
                        <div>
                            <p><strong>الموظف المُستلِم:</strong></p>
                            <p style="font-size: 1.1rem;">${receiptData.toEmployee}</p>
                        </div>
                    </div>

                    <div style="margin: 2rem 0; padding: 1.5rem; background: var(--gray-50); border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
                        <p style="font-weight: 600; margin-bottom: 1rem; font-size: 1.1rem;">
                            📋 العقود المُستلمة/المُسلّمة:
                        </p>
                        <div style="max-height: 200px; overflow-y: auto;">
                            <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                                ${receiptData.contractNumbers.map(num => `
                                    <li style="margin-bottom: 0.5rem; font-size: 1rem;">
                                        <code style="background: var(--white); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--gray-300);">
                                            ${num}
                                        </code>
                                    </li>
                                `).join('')}
                            </ol>
                        </div>
                    </div>

                    ${receiptData.notes ? `
                        <div style="margin: 2rem 0; padding: 1.5rem; background: #fffbeb; border-radius: var(--radius-lg); border: 1px solid #fed7aa;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem; color: #92400e;">
                                📝 ملاحظات:
                            </p>
                            <p style="color: #92400e; line-height: 1.6;">${escapeHtml(receiptData.notes)}</p>
                        </div>
                    ` : ''}
                </div>

                <div class="signature-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-top: 3rem; padding-top: 2rem; border-top: 2px solid var(--gray-300);">
                    <div class="signature-box" style="text-align: center;">
                        <div class="signature-line" style="border-bottom: 2px solid var(--gray-800); margin-bottom: 1rem; height: 60px;"></div>
                        <p style="font-weight: 600; margin-bottom: 0.5rem;">توقيع المُسلِّم</p>
                        <p style="color: var(--gray-600);">${receiptData.fromEmployee}</p>
                    </div>
                    <div class="signature-box" style="text-align: center;">
                        <div class="signature-line" style="border-bottom: 2px solid var(--gray-800); margin-bottom: 1rem; height: 60px;"></div>
                        <p style="font-weight: 600; margin-bottom: 0.5rem;">توقيع المُستلِم</p>
                        <p style="color: var(--gray-600);">${receiptData.toEmployee}</p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--gray-200); color: var(--gray-500); font-size: 0.9rem;">
                    <p>تم إنشاء هذا الإيصال تلقائياً بواسطة نظام إدارة الوثائق</p>
                </div>
            </div>
        `;

        ui.showModal('receiptModal');
    }

    /**
     * عرض تفاصيل حركة موجودة
     */
    async viewTransactionDetails(transactionId) {
        try {
            showLoading(true);

            const transaction = await db.getTransactionDetails(transactionId);
            
            if (!transaction) {
                showAlert('لم يتم العثور على الحركة', 'error');
                return;
            }

            const contractNumbers = transaction.transaction_details.map(
                detail => detail.contract.contract_number
            );

            this.showReceipt({
                receiptNumber: transaction.receipt_number,
                transactionType: transaction.transaction_type,
                fromEmployee: transaction.from_employee.name,
                toEmployee: transaction.to_employee.name,
                contractNumbers: contractNumbers,
                notes: transaction.notes,
                date: formatDate(transaction.transaction_date)
            });

        } catch (error) {
            console.error('خطأ في عرض تفاصيل الحركة:', error);
            showAlert(MESSAGES.error.databaseError, 'error');
        } finally {
            showLoading(false);
        }
    }

    /**
     * طباعة الإيصال
     */
    printReceipt() {
        try {
            // إخفاء العناصر غير المطلوبة للطباعة
            const noprint = document.querySelectorAll('.no-print');
            noprint.forEach(element => {
                element.style.display = 'none';
            });

            // طباعة الصفحة
            window.print();

            // إعادة إظهار العناصر
            setTimeout(() => {
                noprint.forEach(element => {
                    element.style.display = '';
                });
            }, 1000);

        } catch (error) {
            console.error('خطأ في طباعة الإيصال:', error);
            showAlert('حدث خطأ أثناء الطباعة', 'error');
        }
    }

    /**
     * تصدير بيانات الحركة
     */
    async exportTransactionData(format = 'json') {
        try {
            const transactions = await db.getFilteredTransactions('all');
            
            if (format === 'json') {
                downloadJSON(transactions, `transactions-${formatDateOnly(new Date())}.json`);
            } else if (format === 'csv') {
                const headers = [
                    'receipt_number', 'transaction_date', 'transaction_type',
                    'from_employee', 'to_employee', 'notes'
                ];
                
                const csvData = transactions.map(t => ({
                    receipt_number: t.receipt_number,
                    transaction_date: formatDate(t.transaction_date),
                    transaction_type: t.transaction_type,
                    from_employee: t.from_employee?.name || '',
                    to_employee: t.to_employee?.name || '',
                    notes: t.notes || ''
                }));

                downloadCSV(csvData, headers, `transactions-${formatDateOnly(new Date())}.csv`);
            }

            showAlert('تم تصدير البيانات بنجاح', 'success');

        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            showAlert('حدث خطأ أثناء تصدير البيانات', 'error');
        }
    }
}

// إنشاء مثيل واحد من مدير الحركات
const transactionManager = new TransactionManager();

// دوال عامة للوصول السريع
async function viewTransactionDetails(transactionId) {
    await transactionManager.viewTransactionDetails(transactionId);
}

function printReceipt() {
    transactionManager.printReceipt();
}