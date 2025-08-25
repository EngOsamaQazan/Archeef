/**
 * ملف تسجيل الدخول - نظام الأرشيف
 * يحتوي على وظائف إدارة واجهة تسجيل الدخول والتفاعل مع AuthManager
 */

// تهيئة المتغيرات العامة
let connectionStatus = "checking";
let connectionCheckInterval = null;

// عناصر DOM
const elements = {
  // علامات التبويب
  loginTab: document.getElementById("login-tab"),
  magicLinkTab: document.getElementById("magic-link-tab"),
  loginTabContent: document.getElementById("login-tab-content"),
  magicLinkTabContent: document.getElementById("magic-link-tab-content"),

  // نموذج تسجيل الدخول
  loginForm: document.getElementById("login-form"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  rememberMe: document.getElementById("remember-me"),
  loginBtn: document.getElementById("login-btn"),
  loginBtnText: document.querySelector("#login-btn .btn-text"),
  loginBtnSpinner: document.querySelector("#login-btn .spinner-border"),
  checkAccountBtn: document.getElementById("check-account-btn"),

  // نموذج الرابط السحري
  magicLinkForm: document.getElementById("magic-link-form"),
  magicEmail: document.getElementById("magic-email"),
  magicLinkBtn: document.getElementById("magic-link-btn"),
  magicLinkBtnText: document.querySelector("#magic-link-btn .btn-text"),
  magicLinkBtnSpinner: document.querySelector(
    "#magic-link-btn .spinner-border"
  ),

  // رسائل
  errorMessage: document.getElementById("error-message"),
  errorText: document.getElementById("error-text"),
  successMessage: document.getElementById("success-message"),
  successText: document.getElementById("success-text"),

  // حالة الاتصال
  connectionIndicator: document.getElementById("connection-indicator"),
  connectionText: document.getElementById("connection-text"),
  resetConnectionBtn: document.getElementById("reset-connection-btn"),

  // أخرى
  forgotPassword: document.getElementById("forgot-password"),
  togglePassword: document.querySelector(".toggle-password"),
  appVersion: document.getElementById("app-version"),
  currentYear: document.getElementById("current-year"),
  logo: document.getElementById("logo"),
};

/**
 * تهيئة الصفحة عند التحميل
 */
document.addEventListener("DOMContentLoaded", () => {
  // تعيين إصدار التطبيق والسنة الحالية
  if (elements.appVersion) {
    elements.appVersion.textContent = window.APP_CONFIG?.VERSION || "1.0.0";
  }

  if (elements.currentYear) {
    elements.currentYear.textContent = new Date().getFullYear();
  }

  // إضافة مستمعي الأحداث
  addEventListeners();

  // بدء فحص الاتصال
  startConnectionCheck();
});

/**
 * إضافة مستمعي الأحداث لعناصر الصفحة
 */
function addEventListeners() {
  // مستمعي علامات التبويب
  elements.loginTab.addEventListener("click", () => switchTab("login"));
  elements.magicLinkTab.addEventListener("click", () =>
    switchTab("magic-link")
  );

  // مستمعي النماذج
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.magicLinkForm.addEventListener("submit", handleMagicLinkSubmit);

  // مستمع زر إعادة الاتصال
  elements.resetConnectionBtn.addEventListener("click", resetConnection);

  // مستمع نسيت كلمة المرور
  if (elements.forgotPassword) {
    elements.forgotPassword.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("magic-link");
    });
  }

  // مستمع إظهار/إخفاء كلمة المرور
  if (elements.togglePassword) {
    elements.togglePassword.addEventListener("click", togglePasswordVisibility);
  }

  // مستمع التحقق من حالة الحساب
  if (elements.checkAccountBtn) {
    elements.checkAccountBtn.addEventListener("click", checkAccountStatus);
  }

  // مستمع الشعار
  if (elements.logo) {
    elements.logo.addEventListener("click", () => {
      elements.logo.classList.add("rotate-logo");
      setTimeout(() => {
        elements.logo.classList.remove("rotate-logo");
      }, 1000);
    });
  }
}

/**
 * التبديل بين علامات التبويب
 * @param {string} tab اسم علامة التبويب
 */
function switchTab(tab) {
  if (tab === "login") {
    elements.loginTab.classList.add("active");
    elements.magicLinkTab.classList.remove("active");
    elements.loginTabContent.classList.remove("d-none");
    elements.magicLinkTabContent.classList.add("d-none");
  } else if (tab === "magic-link") {
    elements.loginTab.classList.remove("active");
    elements.magicLinkTab.classList.add("active");
    elements.loginTabContent.classList.add("d-none");
    elements.magicLinkTabContent.classList.remove("d-none");

    // نسخ البريد الإلكتروني من نموذج تسجيل الدخول إلى نموذج الرابط السحري إذا كان موجوداً
    if (elements.email.value && !elements.magicEmail.value) {
      elements.magicEmail.value = elements.email.value;
    }
  }
}

/**
 * معالجة تقديم نموذج تسجيل الدخول
 * @param {Event} e حدث التقديم
 */
async function handleLoginSubmit(e) {
  e.preventDefault();

  // التحقق من حالة الاتصال
  if (connectionStatus !== "online") {
    showError(
      "يبدو أنك غير متصل بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
    );
    return;
  }

  // الحصول على قيم الحقول
  const email = elements.email.value.trim();
  const password = elements.password.value;

  // التحقق من صحة الإدخال
  if (!email || !password) {
    showError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
    return;
  }

  try {
    // تغيير حالة الزر إلى جاري التحميل
    setButtonLoading(elements.loginBtn, true);
    hideMessages();

    // التحقق من وجود AuthManager
    if (!window.AuthManager) {
      throw new Error(
        "لم يتم تحميل نظام المصادقة بشكل صحيح. يرجى تحديث الصفحة والمحاولة مرة أخرى."
      );
    }

    // محاولة تسجيل الدخول مباشرة
    console.log("جاري محاولة تسجيل الدخول...");
    const result = await window.AuthManager.emailLogin(email, password);

    console.log("تم تسجيل الدخول بنجاح:", result);

    // إعادة توجيه المستخدم إلى الصفحة الرئيسية
    window.location.href = "index.html";
  } catch (error) {
    console.error("خطأ في تسجيل الدخول:", error);

    // عرض رسالة الخطأ المناسبة
    let errorMessage =
      "حدث خطأ أثناء محاولة تسجيل الدخول. يرجى المحاولة مرة أخرى.";

    if (error.message) {
      if (
        error.message.includes("Invalid login") ||
        error.message.includes("invalid")
      ) {
        errorMessage =
          "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من صحة البيانات المدخلة.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage =
          "لم يتم تأكيد البريد الإلكتروني بعد. يرجى التحقق من بريدك الإلكتروني والنقر على رابط التأكيد.";
        // إضافة زر لإعادة إرسال رابط التأكيد
        errorMessage +=
          ' <button class="btn btn-sm btn-link p-0 resend-confirmation" data-email="' +
          email +
          '">إعادة إرسال رابط التأكيد</button>';
      } else {
        errorMessage = error.message;
      }
    }

    showError(errorMessage);

    // إضافة مستمع لزر إعادة إرسال رابط التأكيد إذا كان موجوداً
    const resendBtn = document.querySelector(".resend-confirmation");
    if (resendBtn) {
      resendBtn.addEventListener("click", async function () {
        try {
          const email = this.getAttribute("data-email");
          await window.AuthManager.resendConfirmationEmail(email);
          showSuccess("تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني.");
        } catch (err) {
          showError("تعذر إرسال رابط التأكيد. يرجى المحاولة مرة أخرى لاحقاً.");
        }
      });
    }
  } finally {
    // إعادة حالة الزر إلى طبيعتها
    setButtonLoading(elements.loginBtn, false);
  }
}

/**
 * معالجة تقديم نموذج الرابط السحري
 * @param {Event} e حدث التقديم
 */
async function handleMagicLinkSubmit(e) {
  e.preventDefault();

  // التحقق من حالة الاتصال
  if (connectionStatus !== "online") {
    showError(
      "يبدو أنك غير متصل بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
    );
    return;
  }

  // الحصول على قيمة البريد الإلكتروني
  const email = elements.magicEmail.value.trim();

  // التحقق من صحة الإدخال
  if (!email) {
    showError("يرجى إدخال البريد الإلكتروني.");
    return;
  }

  try {
    // تغيير حالة الزر إلى جاري التحميل
    setButtonLoading(elements.magicLinkBtn, true);
    hideMessages();

    // التحقق من وجود AuthManager
    if (!window.AuthManager) {
      throw new Error(
        "لم يتم تحميل نظام المصادقة بشكل صحيح. يرجى تحديث الصفحة والمحاولة مرة أخرى."
      );
    }

    // إرسال الرابط السحري
    const result = await window.AuthManager.magicLink(email);

    // عرض رسالة النجاح
    showSuccess(
      "تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني. يرجى التحقق من بريدك الإلكتروني والنقر على الرابط لتسجيل الدخول."
    );

    // مسح حقل البريد الإلكتروني
    elements.magicEmail.value = "";
  } catch (error) {
    console.error("خطأ في إرسال الرابط السحري:", error);

    // عرض رسالة الخطأ المناسبة
    let errorMessage =
      "حدث خطأ أثناء محاولة إرسال الرابط السحري. يرجى المحاولة مرة أخرى.";

    if (error.message) {
      errorMessage = error.message;
    }

    showError(errorMessage);
  } finally {
    // إعادة الزر إلى حالته الطبيعية
    setButtonLoading(elements.magicLinkBtn, false);
  }
}

/**
 * تبديل رؤية كلمة المرور
 */
function togglePasswordVisibility() {
  const passwordInput = elements.password;
  const icon = elements.togglePassword.querySelector("i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.classList.remove("bi-eye");
    icon.classList.add("bi-eye-slash");
  } else {
    passwordInput.type = "password";
    icon.classList.remove("bi-eye-slash");
    icon.classList.add("bi-eye");
  }
}

/**
 * تغيير حالة زر إلى جاري التحميل أو العادية
 * @param {HTMLElement} button عنصر الزر
 * @param {boolean} isLoading حالة التحميل
 */
function setButtonLoading(button, isLoading) {
  const btnText = button.querySelector(".btn-text");
  const spinner = button.querySelector(".spinner-border");

  if (isLoading) {
    button.disabled = true;
    btnText.classList.add("opacity-0");
    spinner.classList.remove("d-none");
  } else {
    button.disabled = false;
    btnText.classList.remove("opacity-0");
    spinner.classList.add("d-none");
  }
}

/**
 * عرض رسالة خطأ
 * @param {string} message نص الرسالة
 */
function showError(message) {
  elements.errorText.innerHTML = message;
  elements.errorMessage.classList.remove("d-none");
  elements.successMessage.classList.add("d-none");
}

/**
 * عرض رسالة نجاح
 * @param {string} message نص الرسالة
 */
function showSuccess(message) {
  elements.successText.innerHTML = message;
  elements.successMessage.classList.remove("d-none");
  elements.errorMessage.classList.add("d-none");
}

/**
 * إخفاء جميع الرسائل
 */
function hideMessages() {
  elements.errorMessage.classList.add("d-none");
  elements.successMessage.classList.add("d-none");
}

/**
 * بدء فحص حالة الاتصال بالخادم
 */
function startConnectionCheck() {
  // تعيين حالة الاتصال الأولية
  updateConnectionStatus("checking");

  // فحص الاتصال الأولي
  checkConnection();

  // إعداد فحص دوري كل 30 ثانية
  connectionCheckInterval = setInterval(checkConnection, 30000);

  // إضافة مستمعي أحداث الشبكة لمعالجة أخطاء CORS بشكل أفضل
  window.addEventListener("online", () => {
    console.log("اتصال الإنترنت متاح الآن");
    checkConnection();
  });

  window.addEventListener("offline", () => {
    console.log("انقطع اتصال الإنترنت");
    updateConnectionStatus("offline");
  });
}

/**
 * فحص حالة الاتصال بالخادم
 */
async function checkConnection() {
  try {
    // التحقق من وجود AuthManager
    if (!window.AuthManager) {
      console.log("AuthManager غير جاهز بعد، جاري الانتظار...");
      updateConnectionStatus("checking");
      return;
    }

    // فحص الاتصال بالإنترنت أولاً
    if (!navigator.onLine) {
      updateConnectionStatus("offline");
      return;
    }

    // فحص الاتصال بـ Supabase
    updateConnectionStatus("checking");

    // اختبار الاتصال بـ Supabase باستخدام AuthManager فقط
    try {
      const isConnected = await window.AuthManager.testConnection();

      // تحديث حالة الاتصال
      updateConnectionStatus(isConnected ? "online" : "offline");
    } catch (connectionError) {
      console.error("خطأ في اختبار الاتصال:", connectionError);
      updateConnectionStatus("offline");
    }
  } catch (error) {
    console.error("خطأ في فحص الاتصال:", error);
    updateConnectionStatus("offline");
  }
}

/**
 * تحديث مؤشر حالة الاتصال
 * @param {string} status حالة الاتصال (online, offline, checking, cors_error)
 */
function updateConnectionStatus(status) {
  connectionStatus = status;

  // تحديث مؤشر الاتصال
  elements.connectionIndicator.className = "indicator";
  elements.connectionIndicator.classList.add(
    status === "cors_error" ? "offline" : status
  );

  // تحديث نص حالة الاتصال
  switch (status) {
    case "online":
      elements.connectionText.textContent = "متصل بالخادم";
      break;
    case "offline":
      elements.connectionText.textContent = "غير متصل بالخادم";
      break;
    case "checking":
      elements.connectionText.textContent = "جاري التحقق من الاتصال...";
      break;
    case "cors_error":
      elements.connectionText.textContent = "مشكلة في الاتصال بالخادم (CORS)";
      break;
  }
}

/**
 * إعادة تهيئة الاتصال بالخادم
 */
async function resetConnection() {
  try {
    // تغيير حالة الزر
    const btnText = elements.resetConnectionBtn.querySelector("span");
    const icon = elements.resetConnectionBtn.querySelector("i");
    const originalText = btnText.textContent;

    elements.resetConnectionBtn.disabled = true;
    btnText.textContent = "جاري إعادة الاتصال...";
    icon.classList.add("bi-arrow-repeat-spinning");

    // تحديث حالة الاتصال
    updateConnectionStatus("checking");

    // التحقق من وجود AuthManager
    if (!window.AuthManager) {
      throw new Error("نظام المصادقة غير جاهز بعد");
    }

    // إعادة تهيئة الاتصال
    const success = await window.AuthManager.reinitializeSupabase();

    // اختبار الاتصال باستخدام AuthManager
    try {
      const isConnected = await window.AuthManager.testConnection();
      updateConnectionStatus(isConnected ? "online" : "offline");
    } catch (error) {
      console.error("خطأ في اختبار الاتصال بعد إعادة التهيئة:", error);
      updateConnectionStatus("offline");
    }

    // عرض رسالة مناسبة
    if (success) {
      showSuccess("تم إعادة الاتصال بالخادم بنجاح.");
    } else {
      showError(
        "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
      );
    }
  } catch (error) {
    console.error("خطأ في إعادة الاتصال:", error);
    updateConnectionStatus("offline");
    showError("حدث خطأ أثناء محاولة إعادة الاتصال: " + error.message);
  } finally {
    // إعادة الزر إلى حالته الطبيعية
    const btnText = elements.resetConnectionBtn.querySelector("span");
    const icon = elements.resetConnectionBtn.querySelector("i");

    elements.resetConnectionBtn.disabled = false;
    btnText.textContent = "إعادة الاتصال";
    icon.classList.remove("bi-arrow-repeat-spinning");
  }
}

/**
 * التحقق من حالة الحساب
 */
async function checkAccountStatus() {
  const email = elements.email.value.trim();

  if (!email) {
    showError("يرجى إدخال البريد الإلكتروني أولاً للتحقق من حالة الحساب.");
    return;
  }

  try {
    // تغيير حالة الزر
    const originalText = elements.checkAccountBtn.innerHTML;
    elements.checkAccountBtn.disabled = true;
    elements.checkAccountBtn.innerHTML =
      '<i class="bi bi-hourglass-split"></i>';

    // التحقق من وجود AuthManager
    if (!window.AuthManager) {
      throw new Error("نظام المصادقة غير جاهز بعد");
    }

    // التحقق من حالة الحساب
    const accountStatus = await window.AuthManager.checkAccountStatus(email);

    // عرض النتيجة
    switch (accountStatus.status) {
      case "exists":
        showSuccess(`الحساب موجود ومفعل: ${email}`);
        break;
      case "not_confirmed":
        showError(
          `الحساب موجود لكن لم يتم تفعيله بعد. يرجى التحقق من بريدك الإلكتروني والنقر على رابط التفعيل.`
        );
        // إضافة زر لإعادة إرسال رابط التفعيل
        showError(
          `<button class="btn btn-sm btn-link p-0 resend-confirmation" data-email="${email}">إعادة إرسال رابط التفعيل</button>`
        );

        // إضافة مستمع لزر إعادة إرسال رابط التفعيل
        const resendBtn = document.querySelector(".resend-confirmation");
        if (resendBtn) {
          resendBtn.addEventListener("click", async function () {
            try {
              const email = this.getAttribute("data-email");
              await window.AuthManager.resendConfirmationEmail(email);
              showSuccess("تم إرسال رابط تفعيل جديد إلى بريدك الإلكتروني.");
            } catch (err) {
              showError(
                "تعذر إرسال رابط التأكيد. يرجى المحاولة مرة أخرى لاحقاً."
              );
            }
          });
        }
        break;
      case "not_found":
        showError(`الحساب غير موجود: ${email}`);
        // إضافة زر لإنشاء حساب جديد
        showError(
          `<button class="btn btn-sm btn-link p-0 create-account" data-email="${email}">إنشاء حساب جديد</button>`
        );

        // إضافة مستمع لزر إنشاء الحساب
        const createBtn = document.querySelector(".create-account");
        if (createBtn) {
          createBtn.addEventListener("click", async function () {
            try {
              const email = this.getAttribute("data-email");
              const password = prompt("أدخل كلمة مرور للحساب الجديد:");
              if (password && password.length >= 6) {
                await window.AuthManager.signUp(email, password);
                showSuccess(
                  "تم إنشاء الحساب بنجاح! تم إرسال رابط التفعيل إلى بريدك الإلكتروني."
                );
              } else if (password) {
                showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
              }
            } catch (err) {
              showError(`تعذر إنشاء الحساب: ${err.message}`);
            }
          });
        }
        break;
      default:
        showError(`خطأ في التحقق من الحساب: ${accountStatus.message}`);
    }
  } catch (error) {
    console.error("خطأ في التحقق من حالة الحساب:", error);
    showError(`حدث خطأ أثناء التحقق من حالة الحساب: ${error.message}`);
  } finally {
    // إعادة الزر إلى حالته الطبيعية
    elements.checkAccountBtn.disabled = false;
    elements.checkAccountBtn.innerHTML =
      '<i class="bi bi-question-circle"></i>';
  }
}

// إضافة أنماط CSS للأيقونة الدوارة
const style = document.createElement("style");
style.textContent = `
  .bi-arrow-repeat-spinning {
    animation: spin 1.5s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .rotate-logo {
    animation: rotate-animation 1s ease-in-out;
  }
  
  @keyframes rotate-animation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .opacity-0 {
    opacity: 0;
  }
`;
document.head.appendChild(style);
