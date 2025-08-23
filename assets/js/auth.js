/**
 * إدارة المصادقة والأدوار
 * Authentication and Role Management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.isAuthenticated = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 3;
    }

    /**
     * تهيئة نظام المصادقة
     */
    async initialize() {
        try {
            // التحقق من حالة المصادقة الحالية
            const { data: { session } } = await db.supabase.auth.getSession();
            
            if (session) {
                await this.handleAuthSuccess(session.user);
            } else {
                this.showLoginForm();
            }

            // مراقبة تغييرات المصادقة
            db.supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    await this.handleAuthSuccess(session.user);
                } else if (event === 'SIGNED_OUT') {
                    this.handleSignOut();
                }
            });

        } catch (error) {
            console.error('خطأ في تهيئة نظام المصادقة:', error);
            this.showLoginForm();
        }
    }

    /**
     * عرض نموذج تسجيل الدخول
     */
    showLoginForm() {
        document.body.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-logo">🔐</div>
                        <h1>نظام إدارة الوثائق</h1>
                        <p>يرجى تسجيل الدخول للمتابعة</p>
                    </div>

                    <form id="loginForm" class="auth-form">
                        <div class="form-group">
                            <label for="email">البريد الإلكتروني</label>
                            <input 
                                type="email" 
                                id="email" 
                                required 
                                placeholder="أدخل بريدك الإلكتروني"
                                autocomplete="email"
                            >
                        </div>

                        <div class="form-group">
                            <label for="password">كلمة المرور</label>
                            <div class="password-input">
                                <input 
                                    type="password" 
                                    id="password" 
                                    required 
                                    placeholder="أدخل كلمة المرور"
                                    autocomplete="current-password"
                                >
                                <button type="button" class="password-toggle" onclick="authManager.togglePassword()">
                                    👁️
                                </button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="rememberMe">
                                <span class="checkmark"></span>
                                تذكرني
                            </label>
                        </div>

                        <button type="submit" class="auth-btn" id="loginBtn">
                            <span class="btn-text">تسجيل الدخول</span>
                            <div class="btn-spinner" style="display: none;"></div>
                        </button>

                        <div id="authError" class="auth-error" style="display: none;"></div>
                    </form>

                    <div class="auth-footer">
                        <p>نسيت كلمة المرور؟ <a href="#" onclick="authManager.showForgotPassword()">إعادة تعيين</a></p>
                    </div>
                </div>

                <div class="auth-background">
                    <div class="auth-pattern"></div>
                </div>
            </div>

            <style>
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 1rem;
                    position: relative;
                    overflow: hidden;
                }

                .auth-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.1;
                    z-index: 0;
                }

                .auth-pattern {
                    width: 100%;
                    height: 100%;
                    background-image: 
                        radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                        radial-gradient(circle at 75% 75%, white 2px, transparent 2px);
                    background-size: 50px 50px;
                    animation: float 20s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                .auth-card {
                    background: white;
                    border-radius: 20px;
                    padding: 2.5rem;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 400px;
                    position: relative;
                    z-index: 1;
                    animation: slideUp 0.6s ease-out;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .auth-logo {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                .auth-header h1 {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #2d3748;
                    margin-bottom: 0.5rem;
                }

                .auth-header p {
                    color: #718096;
                    font-size: 1rem;
                }

                .auth-form {
                    space-y: 1.5rem;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-group label {
                    display: block;
                    font-weight: 600;
                    color: #2d3748;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }

                .form-group input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #f7fafc;
                }

                .form-group input:focus {
                    outline: none;
                    border-color: #667eea;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .password-input {
                    position: relative;
                }

                .password-toggle {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.2rem;
                    opacity: 0.6;
                    transition: opacity 0.3s ease;
                }

                .password-toggle:hover {
                    opacity: 1;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: #4a5568;
                }

                .checkbox-label input {
                    margin-left: 0.5rem;
                    width: auto;
                }

                .auth-btn {
                    width: 100%;
                    padding: 0.875rem;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .auth-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
                }

                .auth-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                .btn-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }

                .auth-error {
                    background: #fed7d7;
                    color: #c53030;
                    padding: 0.75rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    margin-top: 1rem;
                    border: 1px solid #feb2b2;
                }

                .auth-footer {
                    text-align: center;
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #e2e8f0;
                }

                .auth-footer a {
                    color: #667eea;
                    text-decoration: none;
                    font-weight: 600;
                }

                .auth-footer a:hover {
                    text-decoration: underline;
                }

                @media (max-width: 480px) {
                    .auth-card {
                        padding: 2rem 1.5rem;
                        margin: 1rem;
                    }
                    
                    .auth-header h1 {
                        font-size: 1.5rem;
                    }
                }
            </style>
        `;

        // إعداد مستمع نموذج تسجيل الدخول
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // التركيز على حقل البريد الإلكتروني
        setTimeout(() => {
            document.getElementById('email').focus();
        }, 100);
    }

    /**
     * تبديل إظهار/إخفاء كلمة المرور
     */
    togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.querySelector('.password-toggle');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    /**
     * معالجة تسجيل الدخول
     */
    async handleLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnSpinner = loginBtn.querySelector('.btn-spinner');
        const errorDiv = document.getElementById('authError');

        // إخفاء رسائل الخطأ السابقة
        errorDiv.style.display = 'none';

        // التحقق من صحة البيانات
        if (!email || !password) {
            this.showAuthError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showAuthError('يرجى إدخال بريد إلكتروني صحيح');
            return;
        }

        try {
            // تعطيل الزر وإظهار مؤشر التحميل
            loginBtn.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'block';

            // محاولة تسجيل الدخول
            const { data, error } = await db.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            // نجح تسجيل الدخول
            this.loginAttempts = 0;
            
            if (rememberMe) {
                localStorage.setItem('rememberUser', 'true');
            }

        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            
            this.loginAttempts++;
            
            let errorMessage = 'حدث خطأ في تسجيل الدخول';
            
            if (error.message.includes('Email not confirmed')) {
                errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'تم تجاوز عدد المحاولات المسموحة، يرجى المحاولة لاحقاً';
            } else if (error.message.includes('User already registered')) {
                errorMessage = 'المستخدم مسجل مسبقاً، يرجى المحاولة مرة أخرى';
            } else if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'فشل في إنشاء الحساب أو تسجيل الدخول، يرجى التحقق من البيانات';
            }

            if (this.loginAttempts >= this.maxLoginAttempts) {
                errorMessage += ` (المحاولة ${this.loginAttempts}/${this.maxLoginAttempts})`;
            }

            this.showAuthError(errorMessage);

        } finally {
            // إعادة تفعيل الزر
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
        }
    }

    /**
     * معالجة نجاح المصادقة
     */
    async handleAuthSuccess(user) {
        try {
            this.currentUser = user;
            this.isAuthenticated = true;

            // جلب دور المستخدم مع معالجة الأخطاء
            let appUser = null;
            try {
                const { data, error } = await db.supabase
                    .from('app_users')
                    .select('role, employee_id, employees(name, department)')
                    .eq('user_id', user.id)
                    .single();
                    
                if (error && error.code !== 'PGRST116') {
                    throw error;
                }
                
                appUser = data;
            } catch (error) {
                console.warn('لا يمكن جلب بيانات المستخدم من app_users:', error);
            }

            if (!appUser) {
                // إنشاء مستخدم افتراضي إذا لم يكن موجوداً
                console.log('إنشاء مستخدم افتراضي...');
                try {
                    const { data: newAppUser, error: insertError } = await db.supabase
                        .from('app_users')
                        .insert({
                            user_id: user.id,
                            role: user.email === 'osamaqazan89@gmail.com' ? 'manager' : 'employee',
                            is_active: true
                        })
                        .select('role, employee_id')
                        .single();
                        
                    if (insertError) {
                        console.warn('لا يمكن إنشاء مستخدم افتراضي:', insertError);
                        // استخدام قيم افتراضية
                        appUser = {
                            role: user.email === 'osamaqazan89@gmail.com' ? 'manager' : 'employee',
                            employee_id: null,
                            employees: null
                        };
                    } else {
                        appUser = newAppUser;
                    }
                } catch (error) {
                    console.warn('خطأ في إنشاء المستخدم الافتراضي:', error);
                    // استخدام قيم افتراضية
                    appUser = {
                        role: user.email === 'osamaqazan89@gmail.com' ? 'manager' : 'employee',
                        employee_id: null,
                        employees: null
                    };
                }
            }

            this.userRole = appUser.role;
            this.employeeData = appUser.employees;

            console.log('تم تسجيل الدخول بنجاح:', {
                email: user.email,
                role: this.userRole,
                employee: this.employeeData?.name
            });

            // إعادة تحميل التطبيق الرئيسي
            await this.loadMainApp();

        } catch (error) {
            console.error('خطأ في معالجة نجاح المصادقة:', error);
            this.showAuthError('تحذير: بعض بيانات المستخدم قد لا تكون متاحة');
            
            // لا نقوم بتسجيل الخروج، بل نسمح بالمتابعة مع بيانات محدودة
            this.userRole = user.email === 'osamaqazan89@gmail.com' ? 'manager' : 'employee';
            this.employeeData = null;
            
            setTimeout(() => {
                this.loadMainApp();
            }, 2000);
        }
    }

    /**
     * تحميل التطبيق الرئيسي
     */
    async loadMainApp() {
        // إعادة تحميل الصفحة لعرض التطبيق الرئيسي
        location.reload();
    }

    /**
     * معالجة تسجيل الخروج
     */
    handleSignOut() {
        this.currentUser = null;
        this.userRole = null;
        this.isAuthenticated = false;
        this.employeeData = null;
        
        localStorage.removeItem('rememberUser');
        this.showLoginForm();
    }

    /**
     * تسجيل الخروج
     */
    async signOut() {
        try {
            await db.supabase.auth.signOut();
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    }

    /**
     * عرض رسالة خطأ المصادقة
     */
    showAuthError(message) {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // إخفاء الرسالة بعد 5 ثوان
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * التحقق من صحة البريد الإلكتروني
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * عرض نموذج إعادة تعيين كلمة المرور
     */
    showForgotPassword() {
        // يمكن تطوير هذه الميزة لاحقاً
        alert('ميزة إعادة تعيين كلمة المرور قيد التطوير');
    }

    /**
     * التحقق من الصلاحيات
     */
    hasPermission(permission) {
        if (!this.isAuthenticated || !this.userRole) {
            return false;
        }

        const permissions = {
            manager: ['read', 'write', 'delete', 'admin'],
            employee: ['read', 'write'],
            auditor: ['read']
        };

        return permissions[this.userRole]?.includes(permission) || false;
    }

    /**
     * الحصول على معلومات المستخدم الحالي
     */
    getCurrentUser() {
        return {
            user: this.currentUser,
            role: this.userRole,
            employee: this.employeeData,
            isAuthenticated: this.isAuthenticated
        };
    }

    /**
     * عرض قائمة المستخدم
     */
    showUserMenu() {
        const userInfo = this.getCurrentUser();
        
        // إنشاء قائمة منسدلة
        const existingMenu = document.getElementById('userDropdownMenu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'userDropdownMenu';
        menu.className = 'user-dropdown-menu';
        menu.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">👤</div>
                <div class="user-details">
                    <div class="user-name">${userInfo.employee?.name || 'مستخدم'}</div>
                    <div class="user-role">${this.getRoleLabel(userInfo.role)}</div>
                    <div class="user-email">${userInfo.user?.email || ''}</div>
                </div>
            </div>
            <div class="menu-divider"></div>
            <div class="menu-items">
                <button class="menu-item" onclick="authManager.showProfile()">
                    <span class="menu-icon">⚙️</span>
                    الملف الشخصي
                </button>
                <button class="menu-item" onclick="authManager.showSettings()">
                    <span class="menu-icon">🔧</span>
                    الإعدادات
                </button>
                ${userInfo.role === 'manager' ? `
                    <button class="menu-item" onclick="authManager.showAdminPanel()">
                        <span class="menu-icon">👑</span>
                        لوحة الإدارة
                    </button>
                ` : ''}
                <div class="menu-divider"></div>
                <button class="menu-item danger" onclick="authManager.confirmSignOut()">
                    <span class="menu-icon">🚪</span>
                    تسجيل الخروج
                </button>
            </div>
        `;

        // إضافة الأنماط
        const style = document.createElement('style');
        style.textContent = `
            .user-dropdown-menu {
                position: absolute;
                top: calc(100% + 10px);
                left: 0;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                border: 1px solid #e2e8f0;
                min-width: 280px;
                z-index: 1000;
                animation: slideDown 0.2s ease-out;
            }

            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .user-info {
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .user-avatar {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                color: white;
            }

            .user-details .user-name {
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 0.25rem;
            }

            .user-details .user-role {
                font-size: 0.8rem;
                color: #667eea;
                font-weight: 500;
                margin-bottom: 0.25rem;
            }

            .user-details .user-email {
                font-size: 0.75rem;
                color: #718096;
            }

            .menu-divider {
                height: 1px;
                background: #e2e8f0;
                margin: 0.5rem 0;
            }

            .menu-items {
                padding: 0.5rem;
            }

            .menu-item {
                width: 100%;
                padding: 0.75rem;
                background: none;
                border: none;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
                transition: background-color 0.2s ease;
                font-family: inherit;
                font-size: 0.9rem;
                color: #4a5568;
            }

            .menu-item:hover {
                background: #f7fafc;
            }

            .menu-item.danger {
                color: #e53e3e;
            }

            .menu-item.danger:hover {
                background: #fed7d7;
            }

            .menu-icon {
                font-size: 1rem;
            }
        `;

        document.head.appendChild(style);

        // إضافة القائمة للصفحة
        const userBtn = document.querySelector('.user-menu-btn');
        userBtn.style.position = 'relative';
        userBtn.appendChild(menu);

        // إغلاق القائمة عند النقر خارجها
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!userBtn.contains(e.target)) {
                    menu.remove();
                    style.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    /**
     * الحصول على تسمية الدور
     */
    getRoleLabel(role) {
        const labels = {
            manager: 'مدير النظام',
            employee: 'موظف',
            auditor: 'مراجع'
        };
        return labels[role] || 'غير محدد';
    }

    /**
     * تأكيد تسجيل الخروج
     */
    confirmSignOut() {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            this.signOut();
        }
    }

    /**
     * عرض الملف الشخصي
     */
    showProfile() {
        alert('ميزة الملف الشخصي قيد التطوير');
    }

    /**
     * عرض الإعدادات
     */
    showSettings() {
        alert('ميزة الإعدادات قيد التطوير');
    }

    /**
     * عرض لوحة الإدارة
     */
    showAdminPanel() {
        alert('ميزة لوحة الإدارة قيد التطوير');
    }
}

// إنشاء مثيل واحد من مدير المصادقة
const authManager = new AuthManager();