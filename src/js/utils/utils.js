/**
 * @file utils.js
 * @description مجموعة من الدوال المساعدة المستخدمة في مختلف أجزاء التطبيق
 * @version 2.0.0
 */

/**
 * مجموعة الدوال المساعدة للتطبيق
 * @namespace
 */
const ArcheefUtils = {
  /**
   * تنسيق التاريخ والوقت بتنسيق مخصص
   * @param {string|Date} dateString - التاريخ المراد تنسيقه
   * @param {boolean} includeTime - تضمين الوقت في النتيجة
   * @returns {string} التاريخ المنسق
   */
  formatDate(dateString, includeTime = true) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    let formattedDate = `${day}/${month}/${year}`;
    
    if (includeTime) {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";

      // تحويل من 24 ساعة إلى 12 ساعة
      hours = hours % 12;
      hours = hours ? hours : 12; // الساعة 0 تصبح 12
      hours = hours.toString().padStart(2, "0");

      formattedDate += ` - ${hours}:${minutes} ${ampm}`;
    }
    
    return formattedDate;
  },

  /**
   * عرض مؤشر التحميل
   * @param {boolean} show - إظهار أو إخفاء المؤشر
   * @param {string} elementId - معرف عنصر مؤشر التحميل
   */
  showLoader(show = true, elementId = 'loading') {
    const loader = document.getElementById(elementId);
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  },

  /**
   * عرض رسالة خطأ
   * @param {string} message - نص الرسالة
   * @param {string} elementId - معرف عنصر رسالة الخطأ
   * @param {number} duration - مدة ظهور الرسالة بالمللي ثانية (0 للعرض المستمر)
   */
  showError(message, elementId = 'alert', duration = 0) {
    const alertElement = document.getElementById(elementId);
    if (alertElement) {
      alertElement.className = 'alert error';
      alertElement.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${message}`;
      alertElement.style.display = 'block';
      
      if (duration > 0) {
        setTimeout(() => {
          alertElement.style.display = 'none';
        }, duration);
      }
    }
  },

  /**
   * عرض رسالة نجاح
   * @param {string} message - نص الرسالة
   * @param {string} elementId - معرف عنصر رسالة النجاح
   * @param {number} duration - مدة ظهور الرسالة بالمللي ثانية (0 للعرض المستمر)
   */
  showSuccess(message, elementId = 'alert', duration = 0) {
    const alertElement = document.getElementById(elementId);
    if (alertElement) {
      alertElement.className = 'alert success';
      alertElement.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${message}`;
      alertElement.style.display = 'block';
      
      if (duration > 0) {
        setTimeout(() => {
          alertElement.style.display = 'none';
        }, duration);
      }
    }
  },

  /**
   * إخفاء الرسائل
   * @param {string} elementId - معرف عنصر الرسالة
   */
  hideMessages(elementId = 'alert') {
    const alertElement = document.getElementById(elementId);
    if (alertElement) {
      alertElement.style.display = 'none';
    }
  },

  /**
   * تغيير حالة زر إلى جاري التحميل أو العادية
   * @param {HTMLElement} button - عنصر الزر
   * @param {boolean} isLoading - حالة التحميل
   */
  setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner-border');
    
    if (isLoading) {
      button.disabled = true;
      if (btnText) btnText.classList.add('opacity-0');
      if (spinner) spinner.classList.remove('d-none');
    } else {
      button.disabled = false;
      if (btnText) btnText.classList.remove('opacity-0');
      if (spinner) spinner.classList.add('d-none');
    }
  },

  /**
   * التحقق من صحة البريد الإلكتروني
   * @param {string} email - البريد الإلكتروني المراد التحقق منه
   * @returns {boolean} نتيجة التحقق
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * التحقق من اتصال الإنترنت
   * @returns {boolean} حالة الاتصال
   */
  isOnline() {
    return navigator.onLine;
  },

  /**
   * تحويل نص إلى slug (للاستخدام في URLs)
   * @param {string} text - النص المراد تحويله
   * @returns {string} النص المحول
   */
  slugify(text) {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  },

  /**
   * تحويل النص إلى HTML آمن (منع XSS)
   * @param {string} str - النص المراد تحويله
   * @returns {string} النص المحول
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * الحصول على معرف فريد
   * @returns {string} معرف فريد
   */
  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

// تصدير الدوال المساعدة للاستخدام في الملفات الأخرى
export default ArcheefUtils;