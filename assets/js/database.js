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
            
            // التحقق من وجود الجداول المطلوبة
            await this.verifyDatabaseSchema();
            
            return true;
        } catch (error) {
            console.error('خطأ في الاتصال بقاعدة البيانات:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * التحقق من وجود الجداول والأعمدة المطلوبة
     */
    async verifyDatabaseSchema() {
        try {
            // قائمة الجداول المطلوبة
            const requiredTables = [
                'employees',
                'contracts', 
                'transactions',
                'transaction_details',
                'app_users'
            ];
            
            // التحقق من وجود كل جدول
            for (const tableName of requiredTables) {
                const { data, error } = await this.supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                    
                if (error) {
                    console.warn(`تحذير: الجدول ${tableName} غير موجود أو لا يمكن الوصول إليه:`, error.message);
                } else {
                    console.log(`✓ الجدول ${tableName} موجود ويعمل بشكل صحيح`);
                }
            }
            
            // التحقق من وجود الموظفين الأساسيين
            await this.verifyDefaultEmployees();
            
        } catch (error) {
            console.warn('تحذير: لا يمكن التحقق من بنية قاعدة البيانات:', error);
        }
    }
    
    /**
     * التحقق من وجود الموظفين الأساسيين
     */
    async verifyDefaultEmployees() {
        try {
            const { data: employees, error } = await this.supabase
                .from('employees')
                .select('name, department');
                
            if (error) {
                console.warn('لا يمكن التحقق من الموظفين:', error.message);
                return;
            }
            
            const employeeNames = employees?.map(emp => emp.name) || [];
            const requiredEmployees = [
                'ربى الشريف',
                'صفاء ابو قديري', 
                'مؤمن قازان',
                'حسان قازان',
                'عمار قازان',
                'أسامة قازان'
            ];
            
            const missingEmployees = requiredEmployees.filter(name => !employeeNames.includes(name));
            
            if (missingEmployees.length > 0) {
                console.warn('الموظفون المفقودون:', missingEmployees);
            } else {
                console.log('✓ جميع الموظفين الأساسيين موجودون');
            }
            
        } catch (error) {
            console.warn('خطأ في التحقق من الموظفين:', error);
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
     * جلب النشاط الأخير مع معالجة محسنة للأخطاء
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

            if (error) {
                console.warn('تعذر جلب النشاط الأخير:', error.message);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب النشاط الأخير:', error);
            return [];
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
            console.log('🔍 جلب الإحصائيات...');
            
            // إجمالي العقود مع معالجة الأخطاء
            let totalContracts = 0;
            try {
                const { count } = await this.supabase
                    .from('contracts')
                    .select('*', { count: 'exact', head: true });
                totalContracts = count || 0;
            } catch (error) {
                console.warn('تعذر جلب عدد العقود:', error.message);
            }

            // إجمالي الحركات مع معالجة الأخطاء
            let totalTransactions = 0;
            try {
                const { count } = await this.supabase
                    .from('transactions')
                    .select('*', { count: 'exact', head: true });
                totalTransactions = count || 0;
            } catch (error) {
                console.warn('تعذر جلب عدد الحركات:', error.message);
            }

            // حركات اليوم مع معالجة الأخطاء
            let todayTransactions = 0;
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const { count } = await this.supabase
                    .from('transactions')
                    .select('*', { count: 'exact', head: true })
                    .gte('transaction_date', today.toISOString());
                todayTransactions = count || 0;
            } catch (error) {
                console.warn('تعذر جلب حركات اليوم:', error.message);
            }

            // الموظفون النشطون مع معالجة الأخطاء
            let activeEmployees = 0;
            try {
                const { count } = await this.supabase
                    .from('employees')
                    .select('*', { count: 'exact', head: true });
                activeEmployees = count || 0;
            } catch (error) {
                console.warn('تعذر جلب عدد الموظفين:', error.message);
            }

            const stats = {
                totalContracts,
                totalTransactions,
                todayTransactions,
                activeEmployees
            };
            
            console.log('✅ تم جلب الإحصائيات:', stats);
            return stats;
        } catch (error) {
            console.error('خطأ عام في جلب الإحصائيات:', error);
            
            // إرجاع قيم افتراضية في حالة الخطأ
            return {
                totalContracts: 0,
                totalTransactions: 0,
                todayTransactions: 0,
                activeEmployees: 0
            };
        }
    }

    /**
     * جلب الموظفين مع معالجة محسنة للأخطاء
     */
    async getEmployees() {
        try {
            console.log('🔍 جلب الموظفين...');
            const { data, error } = await this.supabase
                .from('contracts')
                .select('*')
                .order('name');

            if (error) {
                console.warn('تعذر جلب الموظفين من قاعدة البيانات:', error.message);
                // استخدام البيانات الافتراضية
                return this.getDefaultEmployees();
            }
            
            console.log('✅ تم جلب الموظفين:', data?.length || 0);
            return data || this.getDefaultEmployees();
        } catch (error) {
            console.error('خطأ في جلب الموظفين:', error);
            // استخدام البيانات الافتراضية في حالة الخطأ
            return this.getDefaultEmployees();
        }
    }

    /**
     * الحصول على الموظفين الافتراضيين
     */
    getDefaultEmployees() {
        const employees = [];
        Object.keys(DEFAULT_EMPLOYEES).forEach(department => {
            DEFAULT_EMPLOYEES[department].forEach(name => {
                employees.push({
                    id: this.generateTempId(),
                    name,
                    department,
                    created_at: new Date().toISOString()
                });
            });
        });
        return employees;
    }

    /**
     * إنشاء معرف مؤقت
     */
    generateTempId() {
        return 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * جلب الحركات حسب الفترة مع معالجة محسنة للأخطاء
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

            if (error) {
                console.warn('تعذر جلب الحركات:', error.message);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب الحركات:', error);
            return [];
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