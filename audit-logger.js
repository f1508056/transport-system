// ==================== دالة تسجيل الأحداث ====================
// type: request | approval | driver | vehicle | trip | issue
// action: نص عربي وصفي
// reference: رقم الطلب / رقم الموظف / رقم المركبة
// details: كائن فيه تفاصيل إضافية (optional)
//   - reason: سبب (للتعديل/الإلغاء/الإعادة)
//   - oldValues: { date, time, driver, vehicle, status }
//   - newValues: { date, time, driver, vehicle, status }

window.logAudit = function(type, action, reference, details = {}) {
    try {
        // جلب المستخدم الحالي
        const userStr = localStorage.getItem('currentUser');
        const user = userStr ? JSON.parse(userStr) : { 
            employeeId: '?', 
            name: 'غير معروف', 
            roleLabel: '?' 
        };

        const entry = {
            id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            type: type,
            action: action,
            reference: reference || null,
            details: details,
            userId: user.employeeId,
            userName: user.name,
            userRole: user.roleLabel,
            timestamp: new Date().toISOString()
        };

        const log = JSON.parse(localStorage.getItem('transportAuditLog') || '[]');
        log.push(entry);

        // حد أقصى 500 حدث
        if (log.length > 500) {
            log.splice(0, log.length - 500);
        }

        localStorage.setItem('transportAuditLog', JSON.stringify(log));
    } catch (err) {
        console.error('خطأ في تسجيل الحدث:', err);
    }
};
