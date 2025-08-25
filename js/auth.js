/**
 * ملف إدارة المصادقة - نظام الأرشيف
 * يحتوي على وظائف إدارة المصادقة والاتصال بـ Supabase
 */

// استيراد الإعدادات من ملف config.js
// استخدام SUPABASE_CONFIG المحدث

// كائن لإدارة المصادقة
const AuthManager = {
  // حالة الاتصال
  isInitialized: false,
  isAuthenticated: false,
  currentUser: null,

  /**
   * تهيئة الاتصال بـ Supabase
   * @returns {Promise<boolean>} نجاح العملية
   */
  async initialize() {
    try {
      // التحقق من وجود مفاتيح Supabase
      if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
        console.error("خطأ: مفاتيح Supabase غير موجودة أو غير صحيحة");
        console.error("URL:", SUPABASE_CONFIG.url);
        console.error(
          "ANON_KEY:",
          SUPABASE_CONFIG.anonKey ? "موجود" : "غير موجود"
        );

        // إظهار رسالة خطأ للمستخدم إذا كان في صفحة تسجيل الدخول
        if (this.isLoginRoute()) {
          setTimeout(() => {
            alert("حدث خطأ في تهيئة النظام. يرجى الاتصال بمسؤول النظام.");
          }, 1000);
        }
        return false;
      }

      // التحقق من وجود كائن supabase
      if (!window.supabase) {
        console.error("خطأ: كائن Supabase غير موجود");
        return false;
      }

      try {
        // إنشاء عميل Supabase
        window.supabase = supabase.createClient(
          SUPABASE_CONFIG.url,
          SUPABASE_CONFIG.anonKey,
          {
            auth: {
              flowType: "pkce",
              detectSessionInUrl: true,
              autoRefreshToken: true,
              persistSession: true,
            },
          }
        );

        // إضافة مستمعي الأحداث
        this.attachAuthListeners();
        this.isInitialized = true;
        return true;
      } catch (error) {
        console.error("خطأ في تهيئة Supabase:", error);
        return false;
      }
    } catch (error) {
      console.error("خطأ غير متوقع في تهيئة المصادقة:", error);
      return false;
    }
  },

  /**
   * التحقق مما إذا كان المستخدم في صفحة تسجيل الدخول
   * @returns {boolean}
   */
  isLoginRoute() {
    const p = location.pathname;
    return p.endsWith("/login") || p.endsWith("login.html") || p === "/";
  },

  /**
   * إضافة مستمعي أحداث المصادقة
   */
  attachAuthListeners() {
    console.log("تم تهيئة Supabase بنجاح!");
    console.log("URL:", SUPABASE_CONFIG.url);
    console.log("Client:", window.supabase);

    // تفادي حلقة إعادة التوجيه: على login فقط نفحص وجود جلسة لإرسال المستخدم للواجهة
    window.supabase.auth.getSession().then(({ data }) => {
      if (this.isLoginRoute() && data?.session) {
        this.isAuthenticated = true;
        this.currentUser = data.session.user;
        location.replace("index.html");
      }
    });

    window.supabase.auth.onAuthStateChange((_event, session) => {
      if (this.isLoginRoute() && session) {
        this.isAuthenticated = true;
        this.currentUser = session.user;
        location.replace("index.html");
      } else if (!session) {
        this.isAuthenticated = false;
        this.currentUser = null;
      }
    });
  },

  /**
   * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
   * @param {string} email البريد الإلكتروني
   * @param {string} password كلمة المرور
   * @param {boolean} retryAttempt محاولة ثانية بعد إعادة التهيئة
   * @returns {Promise<Object>} نتيجة تسجيل الدخول
   */
  async emailLogin(email, password, retryAttempt = false) {
    if (!email || !password) {
      throw new Error("أدخل البريد وكلمة المرور");
    }

    // التحقق من أن Supabase جاهز
    if (!window.supabase) {
      console.error("خطأ: كائن Supabase غير موجود");
      // محاولة إعادة تحميل مكتبة Supabase
      await this.reinitializeSupabase();
      if (!window.supabase) {
        throw new Error(
          "فشل تحميل النظام، يرجى تحديث الصفحة والمحاولة مرة أخرى"
        );
      }
    }

    try {
      console.log(
        "محاولة تسجيل الدخول بـ:",
        email,
        retryAttempt ? "(محاولة ثانية)" : "(محاولة أولى)"
      );
      console.log("Supabase URL:", SUPABASE_CONFIG.url);
      console.log(
        "Supabase Key:",
        SUPABASE_CONFIG.anonKey ? "موجود" : "غير موجود"
      );
      console.log("Supabase client:", window.supabase);

      // تحقق من حالة الاتصال بالإنترنت
      if (!navigator.onLine) {
        throw new Error(
          "يبدو أنك غير متصل بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى."
        );
      }

      // اختبار الاتصال بـ Supabase قبل محاولة تسجيل الدخول
      try {
        const { data, error } = await window.supabase.auth.getSession();
        if (error) {
          console.error("فشل اختبار اتصال Supabase:", error);
        } else {
          console.log("اختبار اتصال Supabase: ناجح");
        }
      } catch (testError) {
        console.error("فشل اختبار اتصال Supabase:", testError);
      }

      const { data, error } = await window.supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("نتيجة تسجيل الدخول:", { data, error });
      console.log("تفاصيل الخطأ (إن وجد):", JSON.stringify(error, null, 2));

      if (error) {
        console.error("خطأ في تسجيل الدخول:", error);
        console.error("رمز الخطأ:", error.status);
        console.error("رسالة الخطأ:", error.message);

        // التحقق من حالة الخادم
        try {
          const response = await fetch(
          `${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=password`,
          {
            method: "HEAD",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_CONFIG.anonKey,
            },
          }
        );
          console.log(
            "حالة اتصال Supabase:",
            response.status,
            response.statusText
          );
        } catch (err) {
          console.error("فشل الاتصال بخادم Supabase:", err);
        }

        // لا نحتاج لإعادة التهيئة، المشكلة في كلمة المرور
        console.log("فشل تسجيل الدخول، يرجى التحقق من البيانات المدخلة");

        throw error;
      }

      if (data?.user) {
        console.log("تم تسجيل الدخول بنجاح:", data.user);
        this.isAuthenticated = true;
        this.currentUser = data.user;
        return data;
      } else {
        console.error("لم يتم الحصول على بيانات المستخدم رغم عدم وجود خطأ");
        throw new Error("لم يتم الحصول على بيانات المستخدم");
      }
    } catch (e) {
      console.error("خطأ كامل:", e);
      throw e;
    }
  },

  /**
   * التحقق من حالة تفعيل الحساب
   * @param {string} email البريد الإلكتروني
   * @returns {Promise<Object>} حالة الحساب
   */
  async checkAccountStatus(email) {
    try {
      // طريقة بسيطة للتحقق من وجود الحساب
      // نحاول إنشاء جلسة مؤقتة للتحقق من الحساب
      const { data: sessionData, error: sessionError } =
        await window.supabase.auth.getSession();

      if (sessionError) {
        // إذا لم تكن هناك جلسة، نفترض أن الحساب موجود ونطلب كلمة المرور
        return {
          status: "exists",
          message: "الحساب موجود (يجب إدخال كلمة المرور الصحيحة)",
        };
      } else {
        // إذا كانت هناك جلسة، فالحساب مفعل
        return { status: "exists", message: "الحساب موجود ومفعل" };
      }
    } catch (error) {
      console.error("خطأ في التحقق من حالة الحساب:", error);

      // إذا فشل التحقق، نفترض أن الحساب موجود ونطلب كلمة المرور
      return {
        status: "exists",
        message: "الحساب موجود (يجب إدخال كلمة المرور الصحيحة)",
      };
    }
  },

  /**
   * تسجيل الدخول باستخدام رابط سحري
   * @param {string} email البريد الإلكتروني
   * @returns {Promise<Object>} نتيجة إرسال الرابط
   */
  async magicLink(email) {
    if (!email) {
      throw new Error("أدخل البريد الإلكتروني");
    }

    try {
      const { error } = await window.supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/login.html` },
      });

      if (error) throw error;
      return { success: true, message: "تم إرسال الرابط السحري إلى بريدك" };
    } catch (e) {
      console.error("خطأ في إرسال الرابط السحري:", e);
      throw e;
    }
  },

  /**
   * تسجيل الخروج
   * @returns {Promise<boolean>} نجاح العملية
   */
  async logout() {
    try {
      await window.supabase.auth.signOut();
      this.isAuthenticated = false;
      this.currentUser = null;
      return true;
    } catch (e) {
      console.error("فشل تسجيل الخروج:", e);
      return false;
    }
  },

  /**
   * اختبار الاتصال بـ Supabase
   * @returns {Promise<boolean>} نجاح الاختبار
   */
  async testConnection() {
    if (!window.supabase) {
      console.log("Supabase غير جاهز بعد");
      return false;
    }

    try {
      const { data, error } = await window.supabase.auth.getSession();
      console.log("اختبار Supabase:", { data, error });
      return !error;
    } catch (e) {
      console.error("خطأ في اختبار Supabase:", e);
      return false;
    }
  },

  /**
   * إعادة تهيئة الاتصال بـ Supabase
   * @returns {Promise<boolean>} نجاح العملية
   */
  async reinitializeSupabase() {
    console.log("جاري إعادة تهيئة اتصال Supabase...");

    try {
      // محاولة تنظيف الجلسة الحالية وجميع بيانات Supabase المخزنة محلياً
      // حذف جميع مفاتيح localStorage المتعلقة بـ Supabase
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("supabase.") ||
          key.includes("supabase") ||
          key.includes("sb-")
        ) {
          console.log("حذف مفتاح من التخزين المحلي:", key);
          localStorage.removeItem(key);
        }
      });

      // حذف جميع ملفات تعريف الارتباط المتعلقة بـ Supabase
      document.cookie.split(";").forEach((cookie) => {
        const cookieName = cookie.split("=")[0].trim();
        if (cookieName.includes("supabase") || cookieName.includes("sb-")) {
          console.log("حذف ملف تعريف ارتباط:", cookieName);
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });

      // تسجيل الخروج من الجلسة الحالية إذا كانت موجودة
      try {
        if (window.supabase && window.supabase.auth) {
          await window.supabase.auth.signOut({ scope: "global" });
          console.log("تم تسجيل الخروج من الجلسة الحالية");
        }
      } catch (signOutError) {
        console.warn("خطأ أثناء تسجيل الخروج:", signOutError);
        // استمر في العملية حتى مع وجود خطأ في تسجيل الخروج
      }

      // إعادة تحميل مكتبة Supabase إذا لم تكن موجودة
      if (!window.supabase) {
        console.log("محاولة إعادة تحميل مكتبة Supabase...");
        try {
          // التحقق من وجود المكتبة في الصفحة
          const supabaseScript = document.querySelector(
            'script[src*="supabase"]'
          );
          if (supabaseScript) {
            // إعادة تحميل المكتبة
            const newScript = document.createElement("script");
            newScript.src = supabaseScript.src;
            newScript.crossOrigin = "anonymous";
            newScript.onload = () =>
              console.log("تم إعادة تحميل مكتبة Supabase");
            newScript.onerror = (e) =>
              console.error("فشل إعادة تحميل مكتبة Supabase:", e);
            document.head.appendChild(newScript);
          }
        } catch (scriptError) {
          console.error("خطأ في إعادة تحميل المكتبة:", scriptError);
        }
      }

      // التحقق من وجود كائن supabase وصلاحيته
      // إعادة إنشاء عميل Supabase
      try {
        if (typeof supabase !== "undefined") {
          window.supabase = supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
              auth: {
                flowType: "pkce",
                detectSessionInUrl: true,
                autoRefreshToken: true,
                persistSession: true,
              },
            }
          );
          console.log("تم إعادة إنشاء عميل Supabase بنجاح");
          this.isInitialized = true;

          // إضافة مستمعي الأحداث مرة أخرى
          this.attachAuthListeners();

          return true;
        } else {
          console.error("كائن supabase غير موجود بعد إعادة التهيئة");
          return false;
        }
      } catch (initError) {
        console.error("خطأ في إعادة إنشاء عميل Supabase:", initError);
        return false;
      }
      let supabaseReloaded = false;

      if (
        !window.supabase ||
        typeof window.supabase !== "object" ||
        !window.supabase.auth
      ) {
        console.log(
          "كائن Supabase غير موجود أو تالف، جاري إعادة تحميل المكتبة..."
        );

        // إعادة تحميل مكتبة Supabase
        supabaseReloaded = await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
          script.onload = () => {
            console.log("تم إعادة تحميل مكتبة Supabase");

            // التحقق من وجود كائن supabase العام بعد التحميل
            if (
              typeof supabase === "undefined" ||
              typeof supabase.createClient !== "function"
            ) {
              console.error(
                "لم يتم العثور على كائن supabase العام بعد التحميل"
              );
              resolve(false);
              return;
            }

            // إنشاء عميل جديد بعد تحميل المكتبة
            try {
              window.supabase = supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey,
                {
                  auth: {
                    flowType: "pkce",
                    detectSessionInUrl: true,
                    autoRefreshToken: true,
                    persistSession: true,
                  },
                }
              );
              console.log("تم إنشاء عميل Supabase جديد بنجاح");
              resolve(true);
            } catch (createError) {
              console.error("فشل إنشاء عميل Supabase جديد:", createError);
              resolve(false);
            }
          };
          script.onerror = () => {
            console.error("فشل إعادة تحميل مكتبة Supabase");
            resolve(false);
          };
          document.head.appendChild(script);
        });

        // إذا فشلت إعادة تحميل المكتبة، نعيد false
        if (!supabaseReloaded) {
          return false;
        }
      } else if (typeof window.supabase.createClient === "function") {
        // إعادة إنشاء العميل إذا كان كائن Supabase موجوداً وله دالة createClient
        try {
          if (
            typeof supabase !== "undefined" &&
            typeof supabase.createClient === "function"
          ) {
            window.supabase = supabase.createClient(
              SUPABASE_CONFIG.url,
              SUPABASE_CONFIG.anonKey,
              {
                auth: {
                  flowType: "pkce",
                  detectSessionInUrl: true,
                  autoRefreshToken: true,
                  persistSession: true,
                },
              }
            );
            console.log("تم إنشاء عميل Supabase جديد بنجاح");
          } else {
            console.error(
              "كائن supabase غير موجود أو لا يحتوي على دالة createClient"
            );
            return false;
          }
        } catch (createError) {
          console.error("فشل إنشاء عميل Supabase جديد:", createError);
          return false;
        }
      }

      // اختبار الاتصال الجديد فقط إذا لم يتم إعادة تحميل المكتبة
      if (
        !supabaseReloaded &&
        window.supabase &&
        typeof window.supabase.auth !== "undefined"
      ) {
        const testResult = await this.testConnection();
        console.log("نتيجة اختبار الاتصال الجديد:", testResult);
        return testResult;
      }

      return true; // إذا تم إعادة تحميل المكتبة، فقد تم اختبار الاتصال بالفعل
    } catch (error) {
      console.error("فشل إعادة تهيئة Supabase:", error);
      return false;
    }
  },

  /**
   * إنشاء حساب جديد
   * @param {string} email البريد الإلكتروني
   * @param {string} password كلمة المرور
   * @returns {Promise<Object>} نتيجة إنشاء الحساب
   */
  async signUp(email, password) {
    try {
      const { data, error } = await window.supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/login.html` },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error("تعذر إنشاء الحساب:", e);
      throw e;
    }
  },

  /**
   * إعادة إرسال رابط التفعيل
   * @param {string} email البريد الإلكتروني
   * @returns {Promise<Object>} نتيجة إعادة الإرسال
   */
  async resendConfirmationEmail(email) {
    try {
      const { error } = await window.supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${location.origin}/login.html` },
      });

      if (error) throw error;
      return { success: true, message: "تم إرسال رابط تفعيل جديد" };
    } catch (e) {
      console.error("تعذر إعادة إرسال رابط التفعيل:", e);
      throw e;
    }
  },
};

// تصدير كائن إدارة المصادقة للاستخدام في الملفات الأخرى
window.AuthManager = AuthManager;

// تهيئة المصادقة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  // تحميل مكتبة Supabase إذا لم تكن محملة
  if (!window.supabase) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = async () => {
      console.log("تم تحميل مكتبة Supabase");
      await AuthManager.initialize();
    };
    document.head.appendChild(script);
  } else {
    await AuthManager.initialize();
  }
});
