/**
 * دوال مساعدة عامة
 * Utility Functions
 */

/**
 * تنسيق التاريخ والوقت
 * @param {string|Date} dateInput - التاريخ المراد تنسيقه
 * @returns {string} التاريخ المنسق
 */
function formatDate(dateInput) {
    try {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        
        if (isNaN(date.getTime())) {
            return 'تاريخ غير صحيح';
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12;
        hours = hours.toString().padStart(2, '0');

        return `${day}/${month}/${year} - ${hours}:${minutes} ${ampm}`;
    } catch (error) {
        console.error('خطأ في تنسيق التاريخ:', error);
        return 'تاريخ غير صحيح';
    }
}

/**
 * تنسيق التاريخ فقط بدون الوقت
 * @param {string|Date} dateInput - التاريخ المراد تنسيقه
 * @returns {string} التاريخ المنسق
 */
function formatDateOnly(dateInput) {
    try {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        
        if (isNaN(date.getTime())) {
            return 'تاريخ غير صحيح';
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('خطأ في تنسيق التاريخ:', error);
        return 'تاريخ غير صحيح';
    }
}

/**
 * إنشاء رقم إيصال فريد
 * @returns {string} رقم الإيصال
 */
function generateReceiptNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCP-${timestamp}-${random}`;
}

/**
 * تنظيف النص من المسافات الزائدة
 * @param {string} text - النص المراد تنظيفه
 * @returns {string} النص المنظف
 */
function cleanText(text) {
    if (typeof text !== 'string') return '';
    return text.trim().replace(/\s+/g, ' ');
}

/**
 * التحقق من صحة رقم العقد
 * @param {string} contractNumber - رقم العقد
 * @returns {boolean} صحة رقم العقد
 */
function validateContractNumber(contractNumber) {
    if (!contractNumber || typeof contractNumber !== 'string') {
        return false;
    }
    
    const cleaned = cleanText(contractNumber);
    const rules = VALIDATION_RULES.contractNumber;
    
    return cleaned.length >= rules.minLength && 
           cleaned.length <= rules.maxLength && 
           rules.pattern.test(cleaned);
}

/**
 * التحقق من صحة اسم الموظف
 * @param {string} employeeName - اسم الموظف
 * @returns {boolean} صحة اسم الموظف
 */
function validateEmployeeName(employeeName) {
    if (!employeeName || typeof employeeName !== 'string') {
        return false;
    }
    
    const cleaned = cleanText(employeeName);
    const rules = VALIDATION_RULES.employeeName;
    
    return cleaned.length >= rules.minLength && 
           cleaned.length <= rules.maxLength && 
           rules.pattern.test(cleaned);
}

/**
 * تحويل النص إلى HTML آمن
 * @param {string} text - النص المراد تحويله
 * @returns {string} النص المحول
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * تحويل أرقام العقود من نص إلى مصفوفة
 * @param {string} contractsText - نص أرقام العقود
 * @returns {string[]} مصفوفة أرقام العقود
 */
function parseContractNumbers(contractsText) {
    if (!contractsText || typeof contractsText !== 'string') {
        return [];
    }
    
    return contractsText
        .split('\n')
        .map(line => cleanText(line))
        .filter(line => line.length > 0)
        .filter(line => validateContractNumber(line));
}

/**
 * تأخير التنفيذ لفترة محددة
 * @param {number} ms - المدة بالميلي ثانية
 * @returns {Promise} وعد التأخير
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * إنشاء معرف فريد
 * @returns {string} المعرف الفريد
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * تحويل الرقم إلى نص مع فواصل الآلاف
 * @param {number} number - الرقم المراد تحويله
 * @returns {string} الرقم المنسق
 */
function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return '0';
    }
    
    return number.toLocaleString('ar-SA');
}

/**
 * نسخ النص إلى الحافظة
 * @param {string} text - النص المراد نسخه
 * @returns {Promise<boolean>} نجح النسخ أم لا
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback للمتصفحات القديمة
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    } catch (error) {
        console.error('خطأ في نسخ النص:', error);
        return false;
    }
}

/**
 * تحميل ملف JSON
 * @param {Object} data - البيانات المراد تحميلها
 * @param {string} filename - اسم الملف
 */
function downloadJSON(data, filename) {
    try {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('خطأ في تحميل الملف:', error);
    }
}

/**
 * التحقق من وجود الإنترنت
 * @returns {boolean} حالة الاتصال
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * تحويل البيانات إلى CSV
 * @param {Array} data - البيانات
 * @param {Array} headers - رؤوس الأعمدة
 * @returns {string} نص CSV
 */
function arrayToCSV(data, headers) {
    try {
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    `"${String(row[header] || '').replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');
        
        return csvContent;
    } catch (error) {
        console.error('خطأ في تحويل البيانات إلى CSV:', error);
        return '';
    }
}

/**
 * تحميل ملف CSV
 * @param {Array} data - البيانات
 * @param {Array} headers - رؤوس الأعمدة
 * @param {string} filename - اسم الملف
 */
function downloadCSV(data, headers, filename) {
    try {
        const csvContent = arrayToCSV(data, headers);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('خطأ في تحميل ملف CSV:', error);
    }
}

/**
 * البحث في النص باللغة العربية
 * @param {string} text - النص المراد البحث فيه
 * @param {string} query - كلمة البحث
 * @returns {boolean} وجود النص أم لا
 */
function searchArabicText(text, query) {
    if (!text || !query) return false;
    
    const normalizedText = text.toLowerCase().trim();
    const normalizedQuery = query.toLowerCase().trim();
    
    return normalizedText.includes(normalizedQuery);
}

/**
 * تحديد نوع الجهاز
 * @returns {string} نوع الجهاز
 */
function getDeviceType() {
    const width = window.innerWidth;
    
    if (width <= 576) return 'mobile';
    if (width <= 768) return 'tablet';
    if (width <= 992) return 'laptop';
    return 'desktop';
}

/**
 * التحقق من دعم المتصفح لميزة معينة
 * @param {string} feature - اسم الميزة
 * @returns {boolean} دعم الميزة أم لا
 */
function isFeatureSupported(feature) {
    switch (feature) {
        case 'localStorage':
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch {
                return false;
            }
        case 'clipboard':
            return !!(navigator.clipboard && window.isSecureContext);
        case 'notifications':
            return 'Notification' in window;
        case 'serviceWorker':
            return 'serviceWorker' in navigator;
        default:
            return false;
    }
}

// تصدير الدوال للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDate,
        formatDateOnly,
        generateReceiptNumber,
        cleanText,
        validateContractNumber,
        validateEmployeeName,
        escapeHtml,
        parseContractNumbers,
        delay,
        generateId,
        formatNumber,
        copyToClipboard,
        downloadJSON,
        isOnline,
        arrayToCSV,
        downloadCSV,
        searchArabicText,
        getDeviceType,
        isFeatureSupported
    };
}