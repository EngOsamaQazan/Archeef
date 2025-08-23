/**
 * إدارة قاعدة البيانات
 * Database Management
 */

class DatabaseManager {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * تهيئة الاتصال بقاعدة البيانات
     */
    async initialize() {
        try {
            if (typeof window.supabase === 'undefined') {
                throw new Error('مكتبة Supabase غير محملة');
            }

            this.supabase = window.supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );

            // اختبار الاتصال
            await this.testConnection();
            this.isConnected = true;
            
            console.log('تم الاتصال بقاعدة البيانات بنجاح');
            return true;
        } catch (error) {
            console.error('خطأ في الاتصال بقاعدة البيانات:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * اختبار الاتصال بقاعدة البيانات
     */
    async testConnection() {
        const { data, error } = await this.supabase
            .from('employees')
            .select('count', { count: 'exact', head: true });

        if (error) {
            throw new Error(`فشل اختبار الاتصال: ${error.message}`);
        }

        return true;
    }

    /**
     * إعادة المحاولة في حالة فشل العملية
     */
    async retryOperation(operation, ...args) {
        for (let i = 0; i <= this.maxRetries; i++) {
            try {
                return await operation.apply(this, args);
            } catch (error) {
                if (i === this.maxRetries) {
                    throw error;
                }
                
                console.warn(`المحاولة ${i + 1} فشلت، إعادة المحاولة...`);
                await delay(1000 * (i + 1)); // تأخير متزايد
            }
        }
    }

    /**
     * جلب جميع الموظفين
     */
    async getEmployees() {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب الموظفين:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * جلب موظف بالاسم
     */
    async getEmployeeByName(name) {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .select('*')
                .eq('name', name)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('خطأ في جلب الموظف:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * إنشاء حركة جديدة
     */
    async createTransaction(transactionData) {
        try {
            // الحصول على معرفات الموظفين
            const fromEmployee = await this.getEmployeeByName(transactionData.fromEmployee);
            const toEmployee = await this.getEmployeeByName(transactionData.toEmployee);

            if (!fromEmployee || !toEmployee) {
                throw new Error('لم يتم العثور على أحد الموظفين');
            }

            // إنشاء الحركة
            const { data: transaction, error: transError } = await this.supabase
                .from('transactions')
                .insert({
                    transaction_type: transactionData.transactionType,
                    from_employee_id: fromEmployee.id,
                    to_employee_id: toEmployee.id,
                    receipt_number: transactionData.receiptNumber,
                    notes: transactionData.notes || null
                })
                .select()
                .single();

            if (transError) throw transError;

            // معالجة العقود
            const contractIds = [];
            for (const contractNumber of transactionData.contractNumbers) {
                const contractId = await this.processContract(
                    contractNumber,
                    toEmployee.id,
                    transactionData.toEmployee
                );
                contractIds.push(contractId);

                // إضافة تفاصيل الحركة
                const { error: detailError } = await this.supabase
                    .from('transaction_details')
                    .insert({
                        transaction_id: transaction.id,
                        contract_id: contractId
                    });

                if (detailError) throw detailError;
            }

            return {
                transaction,
                contractIds
            };
        } catch (error) {
            console.error('خطأ في إنشاء الحركة:', error);
            throw error;
        }
    }

    /**
     * معالجة العقد (إنشاء أو تحديث)
     */
    async processContract(contractNumber, holderId, holderName) {
        try {
            // البحث عن العقد
            let { data: contract } = await this.supabase
                .from('contracts')
                .select('id')
                .eq('contract_number', contractNumber.trim())
                .single();

            if (!contract) {
                // إنشاء عقد جديد
                const { data: newContract, error: contractError } = await this.supabase
                    .from('contracts')
                    .insert({
                        contract_number: contractNumber.trim(),
                        current_holder_id: holderId,
                        status: `مع ${holderName}`
                    })
                    .select('id')
                    .single();

                if (contractError) throw contractError;
                return newContract.id;
            } else {
                // تحديث العقد الموجود
                const { error: updateError } = await this.supabase
                    .from('contracts')
                    .update({
                        current_holder_id: holderId,
                        status: `مع ${holderName}`,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contract.id);

                if (updateError) throw updateError;
                return contract.id;
            }
        } catch (error) {
            console.error('خطأ في معالجة العقد:', error);
            throw error;
        }
    }

    /**
     * البحث عن عقد
     */
    async searchContract(contractNumber) {
        try {
            const { data: contract, error } = await this.supabase
                .from('contracts')
                .select(`
                    *,
                    current_holder:employees!current_holder_id(name, department)
                `)
                .eq('contract_number', contractNumber.trim())
                .single();

            if (error && error.code === 'PGRST116') {
                return null; // لم يتم العثور على العقد
            }

            if (error) throw error;

            // جلب آخر حركة للعقد
            const { data: lastTransaction } = await this.supabase
                .from('transaction_details')
                .select(`
                    transactions(
                        transaction_type,
                        transaction_date,
                        from_employee:employees!from_employee_id(name),
                        to_employee:employees!to_employee_id(name)
                    )
                `)
                .eq('contract_id', contract.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return {
                ...contract,
                lastTransaction: lastTransaction?.transactions
            };
        } catch (error) {
            console.error('خطأ في البحث عن العقد:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * جلب جميع العقود
     */
    async getAllContracts() {
        try {
            const { data, error } = await this.supabase
                .from('contracts')
                .select(`
                    *,
                    current_holder:employees!current_holder_id(name, department)
                `)
                .order('contract_number');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب العقود:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * جلب الإحصائيات
     */
    async getStatistics() {
        try {
            // إجمالي العقود
            const { count: totalContracts } = await this.supabase
                .from('contracts')
                .select('*', { count: 'exact', head: true });

            // إجمالي الحركات
            const { count: totalTransactions } = await this.supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true });

            // حركات اليوم
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count: todayTransactions } = await this.supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .gte('transaction_date', today.toISOString());

            // الموظفون النشطون
            const { count: activeEmployees } = await this.supabase
                .from('employees')
                .select('*', { count: 'exact', head: true });

            return {
                totalContracts: totalContracts || 0,
                totalTransactions: totalTransactions || 0,
                todayTransactions: todayTransactions || 0,
                activeEmployees: activeEmployees || 0
            };
        } catch (error) {
            console.error('خطأ في جلب الإحصائيات:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * جلب الحركات حسب الفترة
     */
    async getTransactionsByPeriod(period = 'all') {
        try {
            let query = this.supabase
                .from('transactions')
                .select(`
                    *,
                    from_employee:employees!from_employee_id(name, department),
                    to_employee:employees!to_employee_id(name, department),
                    transaction_details(count)
                `)
                .order('transaction_date', { ascending: false });

            // تطبيق فلتر الفترة الزمنية
            if (period !== 'all') {
                const now = new Date();
                let startDate;

                switch (period) {
                    case 'today':
                        startDate = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case 'week':
                        startDate = new Date(now.setDate(now.getDate() - 7));
                        break;
                    case 'month':
                        startDate = new Date(now.setMonth(now.getMonth() - 1));
                        break;
                }

                if (startDate) {
                    query = query.gte('transaction_date', startDate.toISOString());
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب الحركات:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * جلب تفاصيل حركة معينة
     */
    async getTransactionDetails(transactionId) {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select(`
                    *,
                    from_employee:employees!from_employee_id(name),
                    to_employee:employees!to_employee_id(name),
                    transaction_details(
                        contract:contracts(contract_number)
                    )
                `)
                .eq('id', transactionId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('خطأ في جلب تفاصيل الحركة:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * جلب النشاط الأخير
     */
    async getRecentActivity(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select(`
                    *,
                    from_employee:employees!from_employee_id(name),
                    to_employee:employees!to_employee_id(name),
                    transaction_details(count)
                `)
                .order('transaction_date', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب النشاط الأخير:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }

    /**
     * جلب الحركات مع فلتر
     */
    async getFilteredTransactions(filter = 'all') {
        try {
            let query = this.supabase
                .from('transactions')
                .select(`
                    *,
                    from_employee:employees!from_employee_id(name),
                    to_employee:employees!to_employee_id(name),
                    transaction_details(
                        contract:contracts(contract_number)
                    )
                `)
                .order('transaction_date', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('transaction_type', filter);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب الحركات المفلترة:', error);
            throw new Error(MESSAGES.error.databaseError);
        }
    }
}

// إنشاء مثيل واحد من مدير قاعدة البيانات
const db = new DatabaseManager();