/**
 * @file login.js
 * @description مدير واجهة تسجيل الدخول - يتعامل مع واجهة المستخدم لتسجيل الدخول
 * @version 2.0.0
 */

import ArcheefAuth from '../core/auth.js';
import ArcheefConfig from '../core/config.js';
import ArcheefUtils from '../utils/utils.js';

/**
 * مدير واجهة تسجيل الدخول
 * @class
 */
class LoginManager {
  /**
   * إنشاء كائن مدير واجهة تسجيل الدخول
   */
  constructor() {
    /** @private */
    this._elements = {};
    /** @private */
    this._connectionStatus = 'checking';
    /** @private */
    this._connectionCheckInterval = null;
  }

  /**
   * تهيئة مدير واجهة تسجيل الدخول
   */
  async initialize() {
    try {
      // تهيئة عناصر DOM
      this._initializeElements();
      
      // تعيين إصدار التطبيق والسنة الحالية
      this._setAppInfo();
      
      // إضافة مستمعي الأحداث
      this._setupEventListeners();
      
      // بدء فحص حالة الاتصال
      this._startConnectionCheck();
      
      // تهيئة مدير المصادقة
      await ArcheefAuth.initialize();
      
      // التحقق من وجود معلمات URL للمصادقة (مثل الرابط السحري)
      this._checkAuthParams();
      
      console.log('تم تهيئة مدير واجهة تسجيل الدخول بنجاح');
    } catch (error) {
      console.error('خطأ في تهيئة مدير واجهة تسجيل الدخول:', error);
    }
  }

  /**
   * تهيئة عناصر DOM
   * @private
   */
  _initializeElements() {
    // علامات التبويب
    this._elements.loginTab = document.getElementById('login-tab');
    this._elements.magicLinkTab = document.getElementById('magic-link-tab');
    this._elements.loginTabContent = document.getElementById('login-tab-content');
    this._elements.magicLinkTabContent = document.getElementById('magic-link-tab-content');
    
    // نماذج تسجيل الدخول
    this._elements.loginForm = document.getElementById('login-form');
    this._elements.magicLinkForm = document.getElementById('magic-link-form');
    
    // حقول النماذج
    this._elements.email = document.getElementById('email');
    this._elements.password = document.getElementById('password');
    this._elements.rememberMe = document.getElementById('remember-me');
    this._elements.magicEmail = document.getElementById('magic-email');
    
    // أزرار النماذج
    this._elements.loginBtn = document.getElementById('login-btn');
    this._elements.magicLinkBtn = document.getElementById('magic-link-btn');
    this._elements.forgotPassword = document.getElementById('forgot-password');
    this._elements.togglePassword = document.querySelector('.toggle-password');
    
    // رسائل الخطأ والنجاح
    this._elements.errorMessage = document.getElementById('error-message');
    this._elements.errorText = document.getElementById('error-text');
    this._elements.successMessage = document.getElementById('success-message');
    this._elements.successText = document.getElementById('success-text');
    
    // حالة الاتصال
    this._elements.connectionIndicator = document.getElementById('connection-indicator');
    this._elements.connectionText = document.getElementById('connection-text');
    this._elements.resetConnectionBtn = document.getElementById('reset-connection-btn');
    
    // معلومات التطبيق
    this._elements.appVersion = document.getElementById('app-version');
    this._elements.currentYear = document.getElementById('current-year');
    this._elements.logo = document.getElementById('logo');
  }

  /**
   * تعيين معلومات التطبيق
   * @private
   */
  _setAppInfo() {
    // تعيين إصدار التطبيق
    if (this._elements.appVersion) {
      this._elements.appVersion.textContent = ArcheefConfig.app.version;
    }
    
    // تعيين السنة الحالية
    if (this._elements.currentYear) {
      this._elements.currentYear.textContent = new Date().getFullYear();
    }
  }

  /**
   * إعداد مستمعي الأحداث
   * @private
   */
  _setupEventListeners() {
    // مستمعي أحداث علامات التبويب
    if (this._elements.loginTab) {
      this._elements.loginTab.addEventListener('click', () => this._switchTab('login'));
    }
    
    if (this._elements.magicLinkTab) {
      this._elements.magicLinkTab.addEventListener('click', () => this._switchTab('magic-link'));
    }
    
    // مستمعي أحداث النماذج
    if (this._elements.loginForm) {
      this._elements.loginForm.addEventListener('submit', (e) => this._handleLoginSubmit(e));
    }
    
    if (this._elements.magicLinkForm) {
      this._elements.magicLinkForm.addEventListener('submit', (e) => this._handleMagicLinkSubmit(e));
    }
    
    // مستمع حدث نسيت كلمة المرور
    if (this._elements.forgotPassword) {
      this._elements.forgotPassword.addEventListener('click', (e) => this._handleForgotPassword(e));
    }
    
    // مستمع حدث إعادة الاتصال
    if (this._elements.resetConnectionBtn) {
      this._elements.resetConnectionBtn.addEventListener('click', () => this._resetConnection());
    }
    
    // مستمع حدث إظهار/إخفاء كلمة المرور
    if (this._elements.togglePassword) {
      this._elements.togglePassword.addEventListener('click', () => this._togglePasswordVisibility());
    }
    
    // مستمع حدث النقر على الشعار
    if (this._elements.logo) {
      this._elements.logo.addEventListener('click', () => {
        this._elements.logo.classList.add('rotate-logo');
        setTimeout(() => {
          this._elements.logo.classList.remove('rotate-logo');
        }, 1000);
      });
    }
  }

  /**
   * التبديل بين علامات التبويب
   * @private
   * @param {string} tab - اسم علامة التبويب (login أو magic-link)
   */
  _switchTab(tab) {
    // إخفاء الرسائل
    this._hideMessages();
    
    if (tab === 'login') {
      // تنشيط علامة تبويب تسجيل الدخول
      this._elements.loginTab.classList.add('active');
      this._elements.magicLinkTab.classList.remove('active');
      
      // إظهار محتوى تسجيل الدخول وإخفاء محتوى الرابط السحري
      this._elements.loginTabContent.classList.remove('d-none');
      this._elements.magicLinkTabContent.classList.add('d-none');
    } else if (tab === 'magic-link') {
      // تنشيط علامة تبويب الرابط السحري
      this._elements.loginTab.classList.remove('active');
      this._elements.magicLinkTab.classList.add('active');
      
      // إظهار محتوى الرابط السحري وإخفاء محتوى تسجيل الدخول
      this._elements.loginTabContent.classList.add('d-none');
      this._elements.magicLinkTabContent.classList.remove('d-none');
    }
  }

  /**
   * معالجة تقديم نموذج تسجيل الدخول
   * @private
   * @param {Event} e - حدث التقديم
   */
  async _handleLoginSubmit(e) {
    e.preventDefault();
    
    // التحقق من حالة الاتصال
    if (this._connectionStatus !== 'online') {
      this._showError('يبدو أنك غير متصل بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      return;
    }
    
    // الحصول على قيم الحقول
    const email = this._elements.email.value.trim();
    const password = this._elements.password.value;
    const rememberMe = this._elements.rememberMe.checked;
    
    // التحقق من صحة الإدخال
    if (!email) {
      this._showError('يرجى إدخال البريد الإلكتروني.');
      return;
    }
    
    if (!password) {
      this._showError('يرجى إدخال كلمة المرور.');
      return;
    }
    
    try {
      // تغيير حالة الزر إلى جاري التحميل
      ArcheefUtils.setButtonLoading(this._elements.loginBtn, true);
      this._hideMessages();
      
      // محاولة تسجيل الدخول
      const result = await ArcheefAuth.signInWithEmail(email, password, rememberMe);
      
      if (result.success) {
        // إعادة توجيه المستخدم إلى الصفحة الرئيسية
        window.location.href = 'index.html';
      } else {
        // عرض رسالة الخطأ المناسبة
        let errorMessage = 'حدث خطأ أثناء محاولة تسجيل الدخول. يرجى المحاولة مرة أخرى.';
        
        if (result.error) {
          if (result.error.message.includes('Invalid login credentials')) {
            errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
          } else if (result.error.message.includes('Email not confirmed')) {
            errorMessage = 'لم يتم تأكيد البريد الإلكتروني بعد. يرجى التحقق من بريدك الإلكتروني والنقر على رابط التأكيد.';
            
            // إضافة زر لإعادة إرسال رابط التأكيد
            errorMessage += '<br><button class="btn btn-sm btn-outline-light mt-2" id="resend-confirmation">إعادة إرسال رابط التأكيد</button>';
            
            this._showError(errorMessage);
            
            // إضافة مستمع حدث لزر إعادة إرسال رابط التأكيد
            document.getElementById('resend-confirmation').addEventListener('click', async () => {
              try {
                await ArcheefAuth.resendConfirmationEmail(email);
                this._showSuccess('تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني.');
              } catch (err) {
                this._showError('تعذر إرسال رابط التأكيد. يرجى المحاولة مرة أخرى لاحقاً.');
              }
            });
            
            return;
          }
        }
        
        this._showError(errorMessage);
      }
    } catch (error) {
      console.error('خطأ في معالجة تسجيل الدخول:', error);
      this._showError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      // إعادة الزر إلى حالته الطبيعية
      ArcheefUtils.setButtonLoading(this._elements.loginBtn, false);
    }
  }

  /**
   * معالجة تقديم نموذج الرابط السحري
   * @private
   * @param {Event} e - حدث التقديم
   */
  async _handleMagicLinkSubmit(e) {
    e.preventDefault();
    
    // التحقق من حالة الاتصال
    if (this._connectionStatus !== 'online') {
      this._showError('يبدو أنك غير متصل بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      return;
    }
    
    // الحصول على قيمة البريد الإلكتروني
    const email = this._elements.magicEmail.value.trim();
    
    // التحقق من صحة الإدخال
    if (!email) {
      this._showError('يرجى إدخال البريد الإلكتروني.');
      return;
    }
    
    try {
      // تغيير حالة الزر إلى جاري التحميل
      ArcheefUtils.setButtonLoading(this._elements.magicLinkBtn, true);
      this._hideMessages();
      
      // إرسال الرابط السحري
      const result = await ArcheefAuth.magicLink(email);
      
      if (result.success) {
        // عرض رسالة النجاح
        this._showSuccess('تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني. يرجى التحقق من بريدك الإلكتروني والنقر على الرابط لتسجيل الدخول.');
        
        // مسح حقل البريد الإلكتروني
        this._elements.magicEmail.value = '';
      } else {
        // عرض رسالة الخطأ المناسبة
        let errorMessage = 'حدث خطأ أثناء محاولة إرسال الرابط السحري. يرجى المحاولة مرة أخرى.';
        
        if (result.error && result.error.message) {
          errorMessage = result.error.message;
        }
        
        this._showError(errorMessage);
      }
    } catch (error) {
      console.error('خطأ في إرسال الرابط السحري:', error);
      this._showError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      // إعادة الزر إلى حالته الطبيعية
      ArcheefUtils.setButtonLoading(this._elements.magicLinkBtn, false);
    }
  }

  /**
   * معالجة نسيت كلمة المرور
   * @private
   * @param {Event} e - حدث النقر
   */
  async _handleForgotPassword(e) {
    e.preventDefault();
    
    // التحقق من حالة الاتصال
    if (this._connectionStatus !== 'online') {
      this._showError('يبدو أنك غير متصل بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      return;
    }
    
    // الحصول على قيمة البريد الإلكتروني
    const email = this._elements.email.value.trim();
    
    // التحقق من صحة الإدخال
    if (!email) {
      this._showError('يرجى إدخال البريد الإلكتروني أولاً.');
      return;
    }
    
    try {
      // تغيير حالة الزر إلى جاري التحميل
      ArcheefUtils.setButtonLoading(this._elements.loginBtn, true);
      this._hideMessages();
      
      // إرسال رابط إعادة تعيين كلمة المرور
      const result = await ArcheefAuth.resetPassword(email);
      
      if (result.success) {
        // عرض رسالة النجاح
        this._showSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من بريدك الإلكتروني واتباع التعليمات.');
      } else {
        // عرض رسالة الخطأ المناسبة
        let errorMessage = 'حدث خطأ أثناء محاولة إرسال رابط إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.';
        
        if (result.error && result.error.message) {
          errorMessage = result.error.message;
        }
        
        this._showError(errorMessage);
      }
    } catch (error) {
      console.error('خطأ في إرسال رابط إعادة تعيين كلمة المرور:', error);
      this._showError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      // إعادة الزر إلى حالته الطبيعية
      ArcheefUtils.setButtonLoading(this._elements.loginBtn, false);
    }
  }

  /**
   * تبديل رؤية كلمة المرور
   * @private
   */
  _togglePasswordVisibility() {
    const passwordInput = this._elements.password;
    const icon = this._elements.togglePassword.querySelector('i');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.remove('bi-eye');
      icon.classList.add('bi-eye-slash');
    } else {
      passwordInput.type = 'password';
      icon.classList.remove('bi-eye-slash');
      icon.classList.add('bi-eye');
    }
  }

  /**
   * بدء فحص حالة الاتصال بالخادم
   * @private
   */
  _startConnectionCheck() {
    // تعيين حالة الاتصال الأولية
    this._updateConnectionStatus('checking');
    
    // فحص الاتصال الأولي
    this._checkConnection();
    
    // إعداد فحص دوري كل 30 ثانية
    this._connectionCheckInterval = setInterval(() => this._checkConnection(), 30000);
  }

  /**
   * فحص حالة الاتصال بالخادم
   * @private
   */
  async _checkConnection() {
    try {
      // فحص الاتصال بالإنترنت أولاً
      if (!ArcheefUtils.isOnline()) {
        this._updateConnectionStatus('offline');
        return;
      }
      
      // فحص الاتصال بـ Supabase
      this._updateConnectionStatus('checking');
      const isConnected = await ArcheefAuth.testConnection();
      
      // تحديث حالة الاتصال
      this._updateConnectionStatus(isConnected ? 'online' : 'offline');
    } catch (error) {
      console.error('خطأ في فحص الاتصال:', error);
      this._updateConnectionStatus('offline');
    }
  }

  /**
   * تحديث مؤشر حالة الاتصال
   * @private
   * @param {string} status - حالة الاتصال (online, offline, checking)
   */
  _updateConnectionStatus(status) {
    this._connectionStatus = status;
    
    // تحديث مؤشر الاتصال
    if (this._elements.connectionIndicator) {
      this._elements.connectionIndicator.className = 'indicator';
      this._elements.connectionIndicator.classList.add(status);
    }
    
    // تحديث نص حالة الاتصال
    if (this._elements.connectionText) {
      switch (status) {
        case 'online':
          this._elements.connectionText.textContent = 'متصل بالخادم';
          break;
        case 'offline':
          this._elements.connectionText.textContent = 'غير متصل بالخادم';
          break;
        case 'checking':
          this._elements.connectionText.textContent = 'جاري التحقق من الاتصال...';
          break;
      }
    }
  }

  /**
   * إعادة تهيئة الاتصال بالخادم
   * @private
   */
  async _resetConnection() {
    try {
      // تغيير حالة الزر
      const btnText = this._elements.resetConnectionBtn.querySelector('span');
      const icon = this._elements.resetConnectionBtn.querySelector('i');
      const originalText = btnText.textContent;
      
      this._elements.resetConnectionBtn.disabled = true;
      btnText.textContent = 'جاري إعادة الاتصال...';
      icon.classList.add('bi-arrow-repeat-spinning');
      
      // تحديث حالة الاتصال
      this._updateConnectionStatus('checking');
      
      // إعادة تهيئة الاتصال
      const success = await ArcheefAuth.reinitializeSupabase();
      
      // تحديث حالة الاتصال
      this._updateConnectionStatus(success ? 'online' : 'offline');
      
      // عرض رسالة مناسبة
      if (success) {
        this._showSuccess('تم إعادة الاتصال بالخادم بنجاح.');
      } else {
        this._showError('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      }
    } catch (error) {
      console.error('خطأ في إعادة الاتصال:', error);
      this._updateConnectionStatus('offline');
      this._showError('حدث خطأ أثناء محاولة إعادة الاتصال: ' + error.message);
    } finally {
      // إعادة الزر إلى حالته الطبيعية
      const btnText = this._elements.resetConnectionBtn.querySelector('span');
      const icon = this._elements.resetConnectionBtn.querySelector('i');
      
      this._elements.resetConnectionBtn.disabled = false;
      btnText.textContent = 'إعادة الاتصال';
      icon.classList.remove('bi-arrow-repeat-spinning');
    }
  }

  /**
   * التحقق من معلمات URL للمصادقة
   * @private
   */
  _checkAuthParams() {
    // التحقق من وجود معلمات URL للمصادقة (مثل الرابط السحري)
    const params = new URLSearchParams(window.location.search);
    
    // إذا كان هناك معلمات مصادقة، عرض رسالة مناسبة
    if (params.has('error_description')) {
      const errorDescription = params.get('error_description');
      this._showError(`حدث خطأ أثناء المصادقة: ${errorDescription}`);
    } else if (params.has('access_token') || params.has('refresh_token')) {
      this._showSuccess('تم تسجيل الدخول بنجاح. جاري إعادة التوجيه...');
      
      // إعادة توجيه المستخدم إلى الصفحة الرئيسية بعد فترة قصيرة
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    }
  }

  /**
   * عرض رسالة خطأ
   * @private
   * @param {string} message - نص الرسالة
   */
  _showError(message) {
    if (this._elements.errorText) {
      this._elements.errorText.innerHTML = message;
    }
    
    if (this._elements.errorMessage) {
      this._elements.errorMessage.classList.remove('d-none');
    }
    
    if (this._elements.successMessage) {
      this._elements.successMessage.classList.add('d-none');
    }
  }

  /**
   * عرض رسالة نجاح
   * @private
   * @param {string} message - نص الرسالة
   */
  _showSuccess(message) {
    if (this._elements.successText) {
      this._elements.successText.innerHTML = message;
    }
    
    if (this._elements.successMessage) {
      this._elements.successMessage.classList.remove('d-none');
    }
    
    if (this._elements.errorMessage) {
      this._elements.errorMessage.classList.add('d-none');
    }
  }

  /**
   * إخفاء جميع الرسائل
   * @private
   */
  _hideMessages() {
    if (this._elements.errorMessage) {
      this._elements.errorMessage.classList.add('d-none');
    }
    
    if (this._elements.successMessage) {
      this._elements.successMessage.classList.add('d-none');
    }
  }
}

// إنشاء نسخة واحدة من مدير واجهة تسجيل الدخول
const loginManager = new LoginManager();

// تهيئة مدير واجهة تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  loginManager.initialize();
});

// تصدير النسخة للاستخدام في الملفات الأخرى إذا لزم الأمر
export default loginManager;