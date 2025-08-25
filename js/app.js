/**
 * ملف التطبيق الرئيسي - نظام الأرشيف
 * يحتوي على وظائف إدارة واجهة المستخدم والتفاعل مع قاعدة البيانات
 */

// كائن التطبيق الرئيسي
const ArcheefApp = {
  // حالة التطبيق
  state: {
    isLoading: false,
    employeesByDept: {},
    statistics: {
      totalContracts: 0,
      totalTransactions: 0,
      monthlyTransactions: 0,
      dailyTransactions: 0
    },
    historyData: [],
    currentPage: 1,
    rowsPerPage: window.APP_CONFIG?.UI?.ROWS_PER_PAGE || 10,
    totalPages: 1,
    filters: {
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      transactionType: '',
      category: ''
    }
  },

  // كائن Supabase
  supabase: null,

  /**
   * تهيئة التطبيق
   */
  async initialize() {
    try {
      console.log('جاري تهيئة التطبيق...');
      
      // تحميل مكتبة Supabase إذا لم تكن محملة
      if (!window.supabase) {
        await this.loadSupabaseLibrary();
      }
      
      // تهيئة Supabase
      this.initializeSupabase();
      
      // إضافة مستمعي الأحداث
      this.addEventListeners();
      
      // تحميل البيانات الأولية
      await this.loadInitialData();
      
      // تهيئة عناصر واجهة المستخدم
      this.setupUIComponents();
      
      console.log('تم تهيئة التطبيق بنجاح');
    } catch (error) {
      console.error('فشل تهيئة التطبيق:', error);
      this.showError('حدث خطأ أثناء تهيئة التطبيق. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
  },

  /**
   * تحميل مكتبة Supabase
   * @returns {Promise} وعد بتحميل المكتبة
   */
  loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      
      script.onload = () => {
        console.log('تم تحميل مكتبة Supabase');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('فشل تحميل مكتبة Supabase:', error);
        reject(new Error('فشل تحميل مكتبة Supabase'));
      };
      
      document.head.appendChild(script);
    });
  },

  /**
   * تهيئة Supabase
   */
  initializeSupabase() {
    try {
      const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || '';
      const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || '';
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('مفاتيح Supabase غير موجودة');
      }
      
      this.supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
      
      window.supabase = this.supabase; // للتوافق مع الكود القديم
      
      console.log('تم تهيئة Supabase بنجاح');
    } catch (error) {
      console.error('فشل تهيئة Supabase:', error);
      throw error;
    }
  },

  /**
   * إضافة مستمعي الأحداث
   */
  addEventListeners() {
    // مستمعي علامات التبويب
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // مستمع نموذج إضافة حركة جديدة
    const newTransactionForm = document.getElementById('newTransactionForm');
    if (newTransactionForm) {
      newTransactionForm.addEventListener('submit', (e) => this.handleNewTransaction(e));
    }
    
    // مستمعي حقول البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.state.filters.searchTerm = searchInput.value;
        this.filterHistory();
      });
    }
    
    // مستمعي تغيير طريقة التسليم
    const deliveryMethod = document.getElementById('deliveryMethod');
    if (deliveryMethod) {
      deliveryMethod.addEventListener('change', () => this.onDeliveryMethodChange());
    }
    
    // مستمعي تغيير نوع العملية
    const operationCategory = document.getElementById('operationCategory');
    if (operationCategory) {
      operationCategory.addEventListener('change', () => this.onOperationCategoryChange());
    }
    
    // مستمعي أزرار التنقل بين الصفحات
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => this.changePage(-1));
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => this.changePage(1));
    }
    
    // مستمعي فلاتر التاريخ
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    if (dateFrom) {
      dateFrom.addEventListener('change', () => {
        this.state.filters.dateFrom = dateFrom.value;
        this.filterHistory();
      });
    }
    
    if (dateTo) {
      dateTo.addEventListener('change', () => {
        this.state.filters.dateTo = dateTo.value;
        this.filterHistory();
      });
    }
    
    // مستمعي فلاتر أخرى
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    
    if (filterType) {
      filterType.addEventListener('change', () => {
        this.state.filters.transactionType = filterType.value;
        this.filterHistory();
      });
    }
    
    if (filterCategory) {
      filterCategory.addEventListener('change', () => {
        this.state.filters.category = filterCategory.value;
        this.filterHistory();
      });
    }
  },

  /**
   * تحميل البيانات الأولية
   */
  async loadInitialData() {
    this.showLoading(true);
    
    try {
      // تحميل البيانات بالتوازي
      await Promise.all([
        this.loadEmployees(),
        this.loadStatistics(),
        this.loadHistory()
      ]);
    } catch (error) {
      console.error('فشل تحميل البيانات الأولية:', error);
      this.showError('حدث خطأ أثناء تحميل البيانات. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    } finally {
      this.showLoading(false);
    }
  },

  /**
   * تهيئة عناصر واجهة المستخدم
   */
  setupUIComponents() {
    // تهيئة القوائم المنسدلة
    this.populateDropdowns();
    
    // تهيئة حقول التاريخ
    this.setupDateFields();
    
    // تحديث حالة عناصر واجهة المستخدم
    this.onDeliveryMethodChange();
    this.onOperationCategoryChange();
    
    // تحديث الإحصائيات
    this.updateStatistics();
  },

  /**
   * تبديل علامات التبويب
   * @param {string} tabId معرف علامة التبويب
   */
  switchTab(tabId) {
    // إخفاء جميع محتويات علامات التبويب
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.remove('active');
    });
    
    // إزالة الفئة النشطة من جميع علامات التبويب
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    
    // تنشيط علامة التبويب المحددة ومحتواها
    document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`${tabId}Content`)?.classList.add('active');
  },

  /**
   * تحميل بيانات الموظفين
   */
  async loadEmployees() {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // بناء employeesByDept ديناميكياً من قاعدة البيانات
      this.state.employeesByDept = {};
      
      if (Array.isArray(data)) {
        data.forEach(row => {
          const dept = row.department || 'غير محدد';
          const name = row.name;
          
          if (!this.state.employeesByDept[dept]) {
            this.state.employeesByDept[dept] = [];
          }
          
          if (name) {
            this.state.employeesByDept[dept].push(name);
          }
        });
        
        // ترتيب الأسماء داخل كل قسم
        Object.keys(this.state.employeesByDept).forEach(dept => {
          this.state.employeesByDept[dept].sort((a, b) => a.localeCompare(b, 'ar'));
        });
      }
      
      console.log('تم تحميل بيانات الموظفين:', Object.keys(this.state.employeesByDept).length, 'قسم');
    } catch (error) {
      console.error('فشل تحميل بيانات الموظفين:', error);
      throw error;
    }
  },

  /**
   * تحميل الإحصائيات
   */
  async loadStatistics() {
    try {
      // إحصائية إجمالي العقود
      const { count: totalContracts, error: contractsError } = await this.supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'عقود');
      
      if (contractsError) throw contractsError;
      
      // إحصائية إجمالي الحركات
      const { count: totalTransactions, error: transactionsError } = await this.supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true });
      
      if (transactionsError) throw transactionsError;
      
      // إحصائية الحركات الشهرية
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
      
      const { count: monthlyTransactions, error: monthlyError } = await this.supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);
      
      if (monthlyError) throw monthlyError;
      
      // إحصائية الحركات اليومية
      const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).toISOString();
      const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1).toISOString();
      
      const { count: dailyTransactions, error: dailyError } = await this.supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay);
      
      if (dailyError) throw dailyError;
      
      // تحديث حالة الإحصائيات
      this.state.statistics = {
        totalContracts: totalContracts || 0,
        totalTransactions: totalTransactions || 0,
        monthlyTransactions: monthlyTransactions || 0,
        dailyTransactions: dailyTransactions || 0
      };
      
      console.log('تم تحميل الإحصائيات:', this.state.statistics);
      
      // تحديث واجهة المستخدم
      this.updateStatistics();
    } catch (error) {
      console.error('فشل تحميل الإحصائيات:', error);
      throw error;
    }
  },

  /**
   * تحميل سجل الحركات
   */
  async loadHistory() {
    try {
      const { data, error, count } = await this.supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      this.state.historyData = data || [];
      this.state.totalPages = Math.ceil((count || 0) / this.state.rowsPerPage);
      
      console.log('تم تحميل سجل الحركات:', this.state.historyData.length, 'حركة');
      
      // تحديث جدول السجل
      this.updateHistoryTable();
    } catch (error) {
      console.error('فشل تحميل سجل الحركات:', error);
      throw error;
    }
  },

  /**
   * تحديث جدول السجل
   */
  updateHistoryTable() {
    const historyTable = document.getElementById('historyTable');
    const historyBody = document.getElementById('historyBody');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!historyTable || !historyBody) {
      console.error('لم يتم العثور على عناصر جدول السجل');
      return;
    }
    
    // تصفية البيانات
    const filteredData = this.filterHistoryData();
    
    // حساب الصفحات
    this.state.totalPages = Math.ceil(filteredData.length / this.state.rowsPerPage);
    
    // التأكد من أن الصفحة الحالية ضمن النطاق
    if (this.state.currentPage > this.state.totalPages) {
      this.state.currentPage = Math.max(1, this.state.totalPages);
    }
    
    // حساب نطاق البيانات للصفحة الحالية
    const startIndex = (this.state.currentPage - 1) * this.state.rowsPerPage;
    const endIndex = Math.min(startIndex + this.state.rowsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // تحديث معلومات الصفحة
    if (pageInfo) {
      pageInfo.textContent = `الصفحة ${this.state.currentPage} من ${this.state.totalPages || 1} (${filteredData.length} حركة)`;
    }
    
    // مسح الجدول الحالي
    historyBody.innerHTML = '';
    
    // إضافة الصفوف الجديدة
    if (pageData.length === 0) {
      // عرض رسالة عندما لا توجد بيانات
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="8" class="empty-table">لا توجد حركات للعرض</td>`;
      historyBody.appendChild(emptyRow);
    } else {
      pageData.forEach(transaction => {
        const row = document.createElement('tr');
        
        // تنسيق التاريخ
        const formattedDate = this.formatDate(transaction.created_at);
        
        // إنشاء محتوى الصف
        row.innerHTML = `
          <td>${transaction.id || ''}</td>
          <td>${transaction.transaction_type || ''}</td>
          <td>${transaction.category || ''}</td>
          <td>${transaction.from_employee || ''}</td>
          <td>${transaction.to_employee || ''}</td>
          <td>${transaction.delivery_method || ''}</td>
          <td>${formattedDate}</td>
          <td>
            <button class="btn-view" data-id="${transaction.id}">عرض</button>
            <button class="btn-print" data-id="${transaction.id}">طباعة</button>
          </td>
        `;
        
        historyBody.appendChild(row);
      });
      
      // إضافة مستمعي أحداث للأزرار
      const viewButtons = historyBody.querySelectorAll('.btn-view');
      const printButtons = historyBody.querySelectorAll('.btn-print');
      
      viewButtons.forEach(button => {
        button.addEventListener('click', () => this.viewTransaction(button.dataset.id));
      });
      
      printButtons.forEach(button => {
        button.addEventListener('click', () => this.printTransaction(button.dataset.id));
      });
    }
    
    // تحديث حالة أزرار التنقل
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
      prevPageBtn.disabled = this.state.currentPage <= 1;
    }
    
    if (nextPageBtn) {
      nextPageBtn.disabled = this.state.currentPage >= this.state.totalPages;
    }
  },

  /**
   * تصفية بيانات السجل
   * @returns {Array} البيانات المصفاة
   */
  filterHistoryData() {
    const { searchTerm, dateFrom, dateTo, transactionType, category } = this.state.filters;
    
    return this.state.historyData.filter(transaction => {
      // تصفية حسب مصطلح البحث
      if (searchTerm && !this.matchSearchTerm(transaction, searchTerm)) {
        return false;
      }
      
      // تصفية حسب التاريخ (من)
      if (dateFrom && new Date(transaction.created_at) < new Date(dateFrom)) {
        return false;
      }
      
      // تصفية حسب التاريخ (إلى)
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // نهاية اليوم
        
        if (new Date(transaction.created_at) > toDate) {
          return false;
        }
      }
      
      // تصفية حسب نوع المعاملة
      if (transactionType && transaction.transaction_type !== transactionType) {
        return false;
      }
      
      // تصفية حسب الفئة
      if (category && transaction.category !== category) {
        return false;
      }
      
      return true;
    });
  },

  /**
   * مطابقة مصطلح البحث مع بيانات المعاملة
   * @param {Object} transaction بيانات المعاملة
   * @param {string} term مصطلح البحث
   * @returns {boolean} نتيجة المطابقة
   */
  matchSearchTerm(transaction, term) {
    const searchTerm = term.toLowerCase();
    const searchableFields = [
      transaction.id?.toString() || '',
      transaction.transaction_type || '',
      transaction.category || '',
      transaction.from_employee || '',
      transaction.to_employee || '',
      transaction.delivery_method || '',
      transaction.tracking_number || '',
      transaction.notes || ''
    ];
    
    return searchableFields.some(field => field.toLowerCase().includes(searchTerm));
  },

  /**
   * تغيير الصفحة الحالية
   * @param {number} direction اتجاه التغيير (1 للتالي، -1 للسابق)
   */
  changePage(direction) {
    const newPage = this.state.currentPage + direction;
    
    if (newPage >= 1 && newPage <= this.state.totalPages) {
      this.state.currentPage = newPage;
      this.updateHistoryTable();
    }
  },

  /**
   * تصفية السجل
   */
  filterHistory() {
    this.state.currentPage = 1; // العودة إلى الصفحة الأولى عند التصفية
    this.updateHistoryTable();
  },

  /**
   * تحديث الإحصائيات في واجهة المستخدم
   */
  updateStatistics() {
    const { totalContracts, totalTransactions, monthlyTransactions, dailyTransactions } = this.state.statistics;
    
    // تحديث عناصر الإحصائيات
    document.getElementById('totalContracts')?.textContent = totalContracts;
    document.getElementById('totalTransactions')?.textContent = totalTransactions;
    document.getElementById('monthlyTransactions')?.textContent = monthlyTransactions;
    document.getElementById('dailyTransactions')?.textContent = dailyTransactions;
  },

  /**
   * ملء القوائم المنسدلة
   */
  populateDropdowns() {
    // ملء قائمة الموظفين
    this.populateEmployeeDropdowns();
    
    // ملء قائمة أنواع المعاملات
    this.populateTransactionTypeDropdowns();
    
    // ملء قائمة فئات المستندات
    this.populateDocumentCategoryDropdowns();
    
    // ملء قائمة طرق التسليم
    this.populateDeliveryMethodDropdowns();
  },

  /**
   * ملء قوائم الموظفين
   */
  populateEmployeeDropdowns() {
    const fromEmployeeSelect = document.getElementById('fromEmployee');
    const toEmployeeSelect = document.getElementById('toEmployee');
    
    if (fromEmployeeSelect && toEmployeeSelect) {
      // مسح القوائم الحالية
      fromEmployeeSelect.innerHTML = '<option value="">اختر الموظف...</option>';
      toEmployeeSelect.innerHTML = '<option value="">اختر الموظف...</option>';
      
      // إضافة مجموعات الأقسام والموظفين
      Object.keys(this.state.employeesByDept).sort().forEach(dept => {
        const fromOptgroup = document.createElement('optgroup');
        const toOptgroup = document.createElement('optgroup');
        
        fromOptgroup.label = dept;
        toOptgroup.label = dept;
        
        this.state.employeesByDept[dept].forEach(employee => {
          const fromOption = document.createElement('option');
          const toOption = document.createElement('option');
          
          fromOption.value = employee;
          fromOption.textContent = employee;
          
          toOption.value = employee;
          toOption.textContent = employee;
          
          fromOptgroup.appendChild(fromOption);
          toOptgroup.appendChild(toOption);
        });
        
        fromEmployeeSelect.appendChild(fromOptgroup);
        toEmployeeSelect.appendChild(toOptgroup);
      });
    }
  },

  /**
   * ملء قوائم أنواع المعاملات
   */
  populateTransactionTypeDropdowns() {
    const operationTypeSelect = document.getElementById('operationType');
    const filterTypeSelect = document.getElementById('filterType');
    
    const transactionTypes = window.APP_CONFIG?.TRANSACTION_TYPES || [];
    
    if (operationTypeSelect) {
      operationTypeSelect.innerHTML = '<option value="">اختر نوع العملية...</option>';
      
      transactionTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = typeof type === 'object' ? type.id : type;
        option.textContent = typeof type === 'object' ? type.name : type;
        operationTypeSelect.appendChild(option);
      });
    }
    
    if (filterTypeSelect) {
      filterTypeSelect.innerHTML = '<option value="">جميع الأنواع</option>';
      
      transactionTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = typeof type === 'object' ? type.id : type;
        option.textContent = typeof type === 'object' ? type.name : type;
        filterTypeSelect.appendChild(option);
      });
    }
  },

  /**
   * ملء قوائم فئات المستندات
   */
  populateDocumentCategoryDropdowns() {
    const operationCategorySelect = document.getElementById('operationCategory');
    const filterCategorySelect = document.getElementById('filterCategory');
    
    const documentCategories = window.APP_CONFIG?.DOCUMENT_CATEGORIES || [];
    
    if (operationCategorySelect) {
      operationCategorySelect.innerHTML = '<option value="">اختر فئة المستند...</option>';
      
      documentCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = typeof category === 'object' ? category.id : category;
        option.textContent = typeof category === 'object' ? category.name : category;
        operationCategorySelect.appendChild(option);
      });
    }
    
    if (filterCategorySelect) {
      filterCategorySelect.innerHTML = '<option value="">جميع الفئات</option>';
      
      documentCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = typeof category === 'object' ? category.id : category;
        option.textContent = typeof category === 'object' ? category.name : category;
        filterCategorySelect.appendChild(option);
      });
    }
  },

  /**
   * ملء قوائم طرق التسليم
   */
  populateDeliveryMethodDropdowns() {
    const deliveryMethodSelect = document.getElementById('deliveryMethod');
    
    const deliveryMethods = window.APP_CONFIG?.DELIVERY_METHODS || [];
    
    if (deliveryMethodSelect) {
      deliveryMethodSelect.innerHTML = '<option value="">اختر طريقة التسليم...</option>';
      
      deliveryMethods.forEach(method => {
        const option = document.createElement('option');
        option.value = typeof method === 'object' ? method.id : method;
        option.textContent = typeof method === 'object' ? method.name : method;
        deliveryMethodSelect.appendChild(option);
      });
    }
  },

  /**
   * تهيئة حقول التاريخ
   */
  setupDateFields() {
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    if (dateFrom && dateTo) {
      // تعيين التاريخ الحالي كقيمة افتراضية لحقل التاريخ (إلى)
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      dateTo.value = formattedDate;
      
      // تعيين تاريخ قبل شهر كقيمة افتراضية لحقل التاريخ (من)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const formattedLastMonth = lastMonth.toISOString().split('T')[0];
      
      dateFrom.value = formattedLastMonth;
      
      // تحديث حالة الفلاتر
      this.state.filters.dateFrom = formattedLastMonth;
      this.state.filters.dateTo = formattedDate;
    }
  },

  /**
   * معالجة تغيير طريقة التسليم
   */
  onDeliveryMethodChange() {
    const deliveryMethod = document.getElementById('deliveryMethod');
    const trackingGroup = document.getElementById('trackingGroup');
    
    if (deliveryMethod && trackingGroup) {
      const method = deliveryMethod.value;
      const shippingMethods = window.APP_CONFIG?.SHIPPING_METHODS || [];
      
      // إظهار حقل رقم التتبع فقط لطرق الشحن
      if (shippingMethods.includes(method)) {
        trackingGroup.classList.remove('hidden');
      } else {
        trackingGroup.classList.add('hidden');
      }
    }
  },

  /**
   * معالجة تغيير نوع العملية
   */
  onOperationCategoryChange() {
    const operationCategory = document.getElementById('operationCategory');
    const contractNumberGroup = document.getElementById('contractNumberGroup');
    const deductionLetterGroup = document.getElementById('deductionLetterGroup');
    
    if (operationCategory && contractNumberGroup && deductionLetterGroup) {
      const category = operationCategory.value;
      
      // إظهار حقل رقم العقد فقط لفئة العقود
      if (category === 'عقود') {
        contractNumberGroup.classList.remove('hidden');
      } else {
        contractNumberGroup.classList.add('hidden');
      }
      
      // إظهار حقول كتب الحسم فقط لفئة كتب الحسم
      if (category === 'كتب حسم') {
        deductionLetterGroup.classList.remove('hidden');
      } else {
        deductionLetterGroup.classList.add('hidden');
      }
    }
  },

  /**
   * معالجة إضافة حركة جديدة
   * @param {Event} e حدث التقديم
   */
  async handleNewTransaction(e) {
    e.preventDefault();
    
    // التحقق من صحة النموذج
    if (!this.validateTransactionForm()) {
      return;
    }
    
    this.showLoading(true);
    
    try {
      // جمع بيانات النموذج
      const formData = this.collectFormData();
      
      // إضافة الحركة إلى قاعدة البيانات
      const { data, error } = await this.supabase
        .from('transactions')
        .insert([formData])
        .select();
      
      if (error) throw error;
      
      console.log('تمت إضافة الحركة بنجاح:', data);
      
      // عرض الإيصال
      if (data && data.length > 0) {
        this.showReceipt(data[0]);
      }
      
      // إعادة تحميل البيانات
      await Promise.all([
        this.loadStatistics(),
        this.loadHistory()
      ]);
      
      // إعادة تعيين النموذج
      this.resetTransactionForm();
      
      // عرض رسالة نجاح
      this.showSuccess('تمت إضافة الحركة بنجاح');
    } catch (error) {
      console.error('فشل إضافة الحركة:', error);
      this.showError('حدث خطأ أثناء إضافة الحركة. يرجى المحاولة مرة أخرى.');
    } finally {
      this.showLoading(false);
    }
  },

  /**
   * التحقق من صحة نموذج الحركة
   * @returns {boolean} صحة النموذج
   */
  validateTransactionForm() {
    // الحقول المطلوبة
    const requiredFields = [
      { id: 'operationType', name: 'نوع العملية' },
      { id: 'operationCategory', name: 'فئة المستند' },
      { id: 'fromEmployee', name: 'الموظف المرسل' },
      { id: 'toEmployee', name: 'الموظف المستلم' },
      { id: 'deliveryMethod', name: 'طريقة التسليم' }
    ];
    
    // التحقق من الحقول المطلوبة
    for (const field of requiredFields) {
      const element = document.getElementById(field.id);
      
      if (!element || !element.value.trim()) {
        this.showError(`يرجى إدخال ${field.name}`);
        element?.focus();
        return false;
      }
    }
    
    // التحقق من حقل رقم التتبع إذا كان مطلوباً
    const deliveryMethod = document.getElementById('deliveryMethod')?.value;
    const trackingNumber = document.getElementById('trackingNumber')?.value;
    const shippingMethods = window.APP_CONFIG?.SHIPPING_METHODS || [];
    
    if (shippingMethods.includes(deliveryMethod) && (!trackingNumber || !trackingNumber.trim())) {
      this.showError('يرجى إدخال رقم التتبع');
      document.getElementById('trackingNumber')?.focus();
      return false;
    }
    
    // التحقق من حقل رقم العقد إذا كان مطلوباً
    const operationCategory = document.getElementById('operationCategory')?.value;
    const contractNumber = document.getElementById('contractNumber')?.value;
    
    if (operationCategory === 'عقود' && (!contractNumber || !contractNumber.trim())) {
      this.showError('يرجى إدخال رقم العقد');
      document.getElementById('contractNumber')?.focus();
      return false;
    }
    
    return true;
  },

  /**
   * جمع بيانات النموذج
   * @returns {Object} بيانات النموذج
   */
  collectFormData() {
    const formData = {
      transaction_type: document.getElementById('operationType')?.value || '',
      category: document.getElementById('operationCategory')?.value || '',
      from_employee: document.getElementById('fromEmployee')?.value || '',
      to_employee: document.getElementById('toEmployee')?.value || '',
      delivery_method: document.getElementById('deliveryMethod')?.value || '',
      notes: document.getElementById('notes')?.value || ''
    };
    
    // إضافة رقم التتبع إذا كان موجوداً
    const trackingNumber = document.getElementById('trackingNumber')?.value;
    if (trackingNumber && trackingNumber.trim()) {
      formData.tracking_number = trackingNumber.trim();
    }
    
    // إضافة رقم العقد إذا كان موجوداً
    const contractNumber = document.getElementById('contractNumber')?.value;
    if (contractNumber && contractNumber.trim()) {
      formData.contract_number = contractNumber.trim();
    }
    
    // إضافة بيانات كتاب الحسم إذا كانت موجودة
    const deductionAmount = document.getElementById('deductionAmount')?.value;
    const deductionReason = document.getElementById('deductionReason')?.value;
    
    if (deductionAmount && deductionAmount.trim()) {
      formData.deduction_amount = deductionAmount.trim();
    }
    
    if (deductionReason && deductionReason.trim()) {
      formData.deduction_reason = deductionReason.trim();
    }
    
    return formData;
  },

  /**
   * إعادة تعيين نموذج الحركة
   */
  resetTransactionForm() {
    const form = document.getElementById('newTransactionForm');
    
    if (form) {
      form.reset();
      
      // إعادة تعيين حالة العناصر المخفية
      this.onDeliveryMethodChange();
      this.onOperationCategoryChange();
    }
  },

  /**
   * عرض معاملة
   * @param {string} id معرف المعاملة
   */
  async viewTransaction(id) {
    this.showLoading(true);
    
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        this.showReceipt(data);
      } else {
        this.showError('لم يتم العثور على المعاملة');
      }
    } catch (error) {
      console.error('فشل عرض المعاملة:', error);
      this.showError('حدث خطأ أثناء محاولة عرض المعاملة');
    } finally {
      this.showLoading(false);
    }
  },

  /**
   * طباعة معاملة
   * @param {string} id معرف المعاملة
   */
  async printTransaction(id) {
    await this.viewTransaction(id);
    this.printReceipt();
  },

  /**
   * عرض الإيصال
   * @param {Object} transaction بيانات المعاملة
   */
  showReceipt(transaction) {
    const receiptModal = document.getElementById('receiptModal');
    const receiptContent = document.getElementById('receiptContent');
    
    if (receiptModal && receiptContent) {
      // تنسيق التاريخ
      const formattedDate = this.formatDate(transaction.created_at);
      
      // إنشاء محتوى الإيصال
      let receiptHTML = `
        <div class="receipt">
          <div class="receipt-header">
            <h2>إيصال استلام وتسليم</h2>
            <p>رقم المعاملة: ${transaction.id}</p>
            <p>التاريخ: ${formattedDate}</p>
          </div>
          
          <div class="receipt-body">
            <table class="receipt-table">
              <tr>
                <th>نوع العملية:</th>
                <td>${transaction.transaction_type || ''}</td>
              </tr>
              <tr>
                <th>فئة المستند:</th>
                <td>${transaction.category || ''}</td>
              </tr>
              <tr>
                <th>من:</th>
                <td>${transaction.from_employee || ''}</td>
              </tr>
              <tr>
                <th>إلى:</th>
                <td>${transaction.to_employee || ''}</td>
              </tr>
              <tr>
                <th>طريقة التسليم:</th>
                <td>${transaction.delivery_method || ''}</td>
              </tr>
      `;
      
      // إضافة رقم التتبع إذا كان موجوداً
      if (transaction.tracking_number) {
        receiptHTML += `
          <tr>
            <th>رقم التتبع:</th>
            <td>${transaction.tracking_number}</td>
          </tr>
        `;
      }
      
      // إضافة رقم العقد إذا كان موجوداً
      if (transaction.contract_number) {
        receiptHTML += `
          <tr>
            <th>رقم العقد:</th>
            <td>${transaction.contract_number}</td>
          </tr>
        `;
      }
      
      // إضافة بيانات كتاب الحسم إذا كانت موجودة
      if (transaction.deduction_amount || transaction.deduction_reason) {
        receiptHTML += `
          <tr>
            <th>مبلغ الحسم:</th>
            <td>${transaction.deduction_amount || ''}</td>
          </tr>
          <tr>
            <th>سبب الحسم:</th>
            <td>${transaction.deduction_reason || ''}</td>
          </tr>
        `;
      }
      
      // إضافة الملاحظات إذا كانت موجودة
      if (transaction.notes) {
        receiptHTML += `
          <tr>
            <th>ملاحظات:</th>
            <td>${transaction.notes}</td>
          </tr>
        `;
      }
      
      // إكمال الإيصال
      receiptHTML += `
            </table>
          </div>
          
          <div class="receipt-footer">
            <div class="signature">
              <p>توقيع المستلم</p>
              <div class="signature-line"></div>
            </div>
            
            <div class="signature">
              <p>توقيع المسلم</p>
              <div class="signature-line"></div>
            </div>
          </div>
        </div>
      `;
      
      // تعيين محتوى الإيصال
      receiptContent.innerHTML = receiptHTML;
      
      // عرض النافذة المنبثقة
      receiptModal.style.display = 'block';
    }
  },

  /**
   * طباعة الإيصال
   */
  printReceipt() {
    window.print();
  },

  /**
   * إغلاق النافذة المنبثقة
   */
  closeModal() {
    const modal = document.getElementById('receiptModal');
    
    if (modal) {
      modal.style.display = 'none';
    }
  },

  /**
   * عرض مؤشر التحميل
   * @param {boolean} show حالة العرض
   */
  showLoading(show) {
    const loading = document.getElementById('loading');
    
    if (loading) {
      this.state.isLoading = show;
      loading.style.display = show ? 'flex' : 'none';
    }
  },

  /**
   * عرض رسالة خطأ
   * @param {string} message نص الرسالة
   */
  showError(message) {
    alert(`خطأ: ${message}`);
  },

  /**
   * عرض رسالة نجاح
   * @param {string} message نص الرسالة
   */
  showSuccess(message) {
    alert(message);
  },

  /**
   * تنسيق التاريخ والوقت
   * @param {string} dateString سلسلة التاريخ
   * @returns {string} التاريخ المنسق
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // تحويل من 24 ساعة إلى 12 ساعة
    hours = hours % 12;
    hours = hours ? hours : 12; // الساعة 0 تصبح 12
    hours = hours.toString().padStart(2, '0');
    
    return `${day}/${month}/${year} - ${hours}:${minutes} ${ampm}`;
  }
};

// تصدير كائن التطبيق للاستخدام في الملفات الأخرى
window.ArcheefApp = ArcheefApp;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // إضافة مستمعي الأحداث العامة
  window.closeModal = () => ArcheefApp.closeModal();
  window.printReceipt = () => ArcheefApp.printReceipt();
  
  // تهيئة التطبيق
  ArcheefApp.initialize();
});