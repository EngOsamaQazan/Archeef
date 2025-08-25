/**
 * @file auth.js
 * @description مدير المصادقة للتطبيق - يتعامل مع تسجيل الدخول والخروج وإدارة الجلسات
 * @version 2.0.0
 */

import ArcheefConfig from './config.js';
import ArcheefUtils from '../utils/utils.js';

/**
 * مدير المصادقة للتطبيق
 * @class
 */
class ArcheefAuth {
  /**
   * إنشاء كائن مدير المصادقة
   */
  constructor() {
    /** @private */
    this._supabase = null;
    /** @private */
    this._user = null;
    /** @private */
    this._connectionStatus = 'checking';
    /** @private */
    this._eventListeners = {};
    /** @private */
    this._initialized = false;
  }

  /**
   * تهيئة مدير المصادقة
   * @returns {Promise<boolean>} نجاح التهيئة
   */
  async initialize() {
    try {
      // التحقق من تحميل مكتبة Supabase
      if (typeof supabase === 'undefined') {
        await this._loadSupabaseLibrary();
      }

      // التحقق من مفاتيح Supabase
      if (!ArcheefConfig.supabase.url || !ArcheefConfig.supabase.anonKey) {
        throw new Error('مفاتيح Supabase غير متوفرة');
      }

      // إنشاء عميل Supabase
      this._supabase = window.supabase.createClient(
        ArcheefConfig.supabase.url,
        ArcheefConfig.supabase.anonKey
      );

      // إضافة مستمعي أحداث المصادقة
      this._setupAuthEventListeners();

      // التحقق من حالة المصادقة الحالية
      await this._checkCurrentSession();

      this._initialized = true;
      this._emitEvent('initialized', { success: true });
      return true;
    } catch (error) {
      console.error('خطأ في تهيئة مدير المصادقة:', error);
      this._emitEvent('initialized', { success: false, error });
      return false;
    }
  }

  /**
   * تحميل مكتبة Supabase
   * @private
   * @returns {Promise<void>}
   */
  _loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('فشل تحميل مكتبة Supabase'));
      document.head.appendChild(script);
    });
  }

  /**
   * إعداد مستمعي أحداث المصادقة
   * @private
   */
  _setupAuthEventListeners() {
    if (!this._supabase) return;

    // الاستماع لتغييرات حالة المصادقة
    this._supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        this._user = session?.user || null;
        this._emitEvent('signedIn', { user: this._user });
      } else if (event === 'SIGNED_OUT') {
        this._user = null;
        this._emitEvent('signedOut');
      } else if (event === 'USER_UPDATED') {
        this._user = session?.user || null;
        this._emitEvent('userUpdated', { user: this._user });
      }
    });
  }

  /**
   * التحقق من الجلسة الحالية
   * @private
   * @returns {Promise<void>}
   */
  async _checkCurrentSession() {
    try {
      const { data, error } = await this._supabase.auth.getSession();
      if (error) throw error;
      
      this._user = data.session?.user || null;
      this._connectionStatus = 'online';
      
      if (this._user) {
        this._emitEvent('signedIn', { user: this._user });
      }
    } catch (error) {
      console.error('خطأ في التحقق من الجلسة الحالية:', error);
      this._connectionStatus = 'offline';
    }
  }

  /**
   * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
   * @param {string} email - البريد الإلكتروني
   * @param {string} password - كلمة المرور
   * @param {boolean} rememberMe - تذكر تسجيل الدخول
   * @returns {Promise<Object>} نتيجة تسجيل الدخول
   */
  async signInWithEmail(email, password, rememberMe = false) {
    try {
      // التحقق من اتصال الإنترنت
      if (!ArcheefUtils.isOnline()) {
        throw new Error('لا يوجد اتصال بالإنترنت');
      }

      // التحقق من تهيئة Supabase
      if (!this._supabase) {
        await this.initialize();
      }

      // تسجيل الدخول
      const { data, error } = await this._supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          // تعيين مدة الجلسة حسب خيار تذكر تسجيل الدخول
          expiresIn: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 // 30 يوم أو يوم واحد
        }
      });

      if (error) throw error;

      this._user = data.user;
      this._connectionStatus = 'online';
      this._emitEvent('signedIn', { user: this._user });

      return { success: true, user: this._user };
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      
      // إعادة تهيئة Supabase في حالة فشل الاتصال
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        this._connectionStatus = 'offline';
        this._emitEvent('connectionError', { error });
      }
      
      return { success: false, error };
    }
  }

  /**
   * إرسال رابط سحري لتسجيل الدخول
   * @param {string} email - البريد الإلكتروني
   * @returns {Promise<Object>} نتيجة إرسال الرابط
   */
  async magicLink(email) {
    try {
      // التحقق من اتصال الإنترنت
      if (!ArcheefUtils.isOnline()) {
        throw new Error('لا يوجد اتصال بالإنترنت');
      }

      // التحقق من تهيئة Supabase
      if (!this._supabase) {
        await this.initialize();
      }

      // إرسال الرابط السحري
      const { error } = await this._supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('خطأ في إرسال الرابط السحري:', error);
      
      // إعادة تهيئة Supabase في حالة فشل الاتصال
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        this._connectionStatus = 'offline';
        this._emitEvent('connectionError', { error });
      }
      
      return { success: false, error };
    }
  }

  /**
   * تسجيل الخروج
   * @returns {Promise<Object>} نتيجة تسجيل الخروج
   */
  async signOut() {
    try {
      // التحقق من تهيئة Supabase
      if (!this._supabase) {
        throw new Error('لم يتم تهيئة Supabase');
      }

      // تسجيل الخروج
      const { error } = await this._supabase.auth.signOut();
      if (error) throw error;

      this._user = null;
      this._emitEvent('signedOut');

      return { success: true };
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      return { success: false, error };
    }
  }

  /**
   * إعادة تعيين كلمة المرور
   * @param {string} email - البريد الإلكتروني
   * @returns {Promise<Object>} نتيجة إرسال رابط إعادة تعيين كلمة المرور
   */
  async resetPassword(email) {
    try {
      // التحقق من اتصال الإنترنت
      if (!ArcheefUtils.isOnline()) {
        throw new Error('لا يوجد اتصال بالإنترنت');
      }

      // التحقق من تهيئة Supabase
      if (!this._supabase) {
        await this.initialize();
      }

      // إرسال رابط إعادة تعيين كلمة المرور
      const { error } = await this._supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('خطأ في إرسال رابط إعادة تعيين كلمة المرور:', error);
      return { success: false, error };
    }
  }

  /**
   * إنشاء حساب جديد
   * @param {string} email - البريد الإلكتروني
   * @param {string} password - كلمة المرور
   * @param {Object} metadata - بيانات إضافية للمستخدم
   * @returns {Promise<Object>} نتيجة إنشاء الحساب
   */
  async signUp(email, password, metadata = {}) {
    try {
      // التحقق من اتصال الإنترنت
      if (!ArcheefUtils.isOnline()) {
        throw new Error('لا يوجد اتصال بالإنترنت');
      }

      // التحقق من تهيئة Supabase
      if (!this._supabase) {
        await this.initialize();
      }

      // إنشاء حساب جديد
      const { data, error } = await this._supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      return { 
        success: true, 
        user: data.user,
        // التحقق مما إذا كان البريد الإلكتروني بحاجة إلى تأكيد
        needsEmailConfirmation: !data.session
      };
    } catch (error) {
      console.error('خطأ في إنشاء حساب جديد:', error);
      return { success: false, error };
    }
  }

  /**
   * إعادة إرسال رابط تأكيد البريد الإلكتروني
   * @param {string} email - البريد الإلكتروني
   * @returns {Promise<Object>} نتيجة إعادة إرسال رابط التأكيد
   */
  async resendConfirmationEmail(email) {
    try {
      // التحقق من اتصال الإنترنت
      if (!ArcheefUtils.isOnline()) {
        throw new Error('لا يوجد اتصال بالإنترنت');
      }

      // التحقق من تهيئة Supabase
      if (!this._supabase) {
        await this.initialize();
      }

      // إعادة إرسال رابط التأكيد
      const { error } = await this._supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('خطأ في إعادة إرسال رابط التأكيد:', error);
      return { success: false, error };
    }
  }

  /**
   * اختبار الاتصال بـ Supabase
   * @returns {Promise<boolean>} حالة الاتصال
   */
  async testConnection() {
    try {
      // التحقق من اتصال الإنترنت
      if (!ArcheefUtils.isOnline()) {
        return false;
      }

      // التحقق من تهيئة Supabase
      if (!this._supabase) {
        await this.initialize();
      }

      // اختبار الاتصال بإجراء استعلام بسيط
      const { error } = await this._supabase.from('employees').select('count', { count: 'exact', head: true });
      
      const isConnected = !error;
      this._connectionStatus = isConnected ? 'online' : 'offline';
      this._emitEvent('connectionStatusChanged', { status: this._connectionStatus });
      
      return isConnected;
    } catch (error) {
      console.error('خطأ في اختبار الاتصال:', error);
      this._connectionStatus = 'offline';
      this._emitEvent('connectionStatusChanged', { status: this._connectionStatus });
      return false;
    }
  }

  /**
   * إعادة تهيئة اتصال Supabase
   * @returns {Promise<boolean>} نجاح إعادة التهيئة
   */
  async reinitializeSupabase() {
    try {
      // مسح بيانات التخزين المحلي وملفات تعريف الارتباط المتعلقة بـ Supabase
      this._clearSupabaseStorage();
      
      // تسجيل الخروج من الجلسة الحالية إذا كانت موجودة
      if (this._supabase) {
        try {
          await this._supabase.auth.signOut();
        } catch (e) {
          console.warn('تعذر تسجيل الخروج أثناء إعادة التهيئة:', e);
        }
      }
      
      // إعادة تحميل مكتبة Supabase إذا لزم الأمر
      if (typeof supabase === 'undefined') {
        await this._loadSupabaseLibrary();
      }
      
      // إعادة إنشاء عميل Supabase
      this._supabase = window.supabase.createClient(
        ArcheefConfig.supabase.url,
        ArcheefConfig.supabase.anonKey
      );
      
      // إعادة إعداد مستمعي الأحداث
      this._setupAuthEventListeners();
      
      // اختبار الاتصال
      const isConnected = await this.testConnection();
      
      this._emitEvent('reinitialized', { success: isConnected });
      return isConnected;
    } catch (error) {
      console.error('خطأ في إعادة تهيئة Supabase:', error);
      this._connectionStatus = 'offline';
      this._emitEvent('reinitialized', { success: false, error });
      return false;
    }
  }

  /**
   * مسح بيانات التخزين المحلي وملفات تعريف الارتباط المتعلقة بـ Supabase
   * @private
   */
  _clearSupabaseStorage() {
    try {
      // مسح بيانات التخزين المحلي المتعلقة بـ Supabase
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // مسح ملفات تعريف الارتباط المتعلقة بـ Supabase
      document.cookie.split(';').forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName.startsWith('sb-') || cookieName.includes('supabase')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch (error) {
      console.error('خطأ في مسح بيانات Supabase:', error);
    }
  }

  /**
   * إضافة مستمع حدث
   * @param {string} event - اسم الحدث
   * @param {Function} callback - دالة رد الاتصال
   */
  on(event, callback) {
    if (!this._eventListeners[event]) {
      this._eventListeners[event] = [];
    }
    this._eventListeners[event].push(callback);
  }

  /**
   * إزالة مستمع حدث
   * @param {string} event - اسم الحدث
   * @param {Function} callback - دالة رد الاتصال
   */
  off(event, callback) {
    if (!this._eventListeners[event]) return;
    
    this._eventListeners[event] = this._eventListeners[event].filter(
      listener => listener !== callback
    );
  }

  /**
   * إطلاق حدث
   * @private
   * @param {string} event - اسم الحدث
   * @param {Object} data - بيانات الحدث
   */
  _emitEvent(event, data = {}) {
    if (!this._eventListeners[event]) return;
    
    this._eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`خطأ في مستمع الحدث ${event}:`, error);
      }
    });
  }

  /**
   * الحصول على المستخدم الحالي
   * @returns {Object|null} بيانات المستخدم
   */
  getCurrentUser() {
    return this._user;
  }

  /**
   * التحقق مما إذا كان المستخدم مسجل الدخول
   * @returns {boolean} حالة تسجيل الدخول
   */
  isAuthenticated() {
    return !!this._user;
  }

  /**
   * الحصول على حالة الاتصال الحالية
   * @returns {string} حالة الاتصال (online, offline, checking)
   */
  getConnectionStatus() {
    return this._connectionStatus;
  }

  /**
   * الحصول على كائن Supabase
   * @returns {Object|null} كائن Supabase
   */
  getSupabase() {
    return this._supabase;
  }
}

// إنشاء نسخة واحدة من مدير المصادقة للاستخدام في جميع أنحاء التطبيق
const archeefAuth = new ArcheefAuth();

// تصدير النسخة للاستخدام في الملفات الأخرى
export default archeefAuth;