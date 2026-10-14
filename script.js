// ==================== إعدادات المستخدمين ====================
// لاحقًا سيتم استبدال هذا بقاعدة بيانات حقيقية

const users = [
    {
        employeeId: "1001",
        password: "admin123",
        role: "superuser",
        name: "المستخدم الأعلى",
        roleLabel: "Super User"
    },
    {
        employeeId: "2001",
        password: "sched123",
        role: "scheduler",
        name: "أحمد المجدول",
        roleLabel: "Scheduler"
    },
    {
        employeeId: "3001",
        password: "disp123",
        role: "dispatcher",
        name: "محمد المنفذ",
        roleLabel: "Dispatcher"
    },
    {
        employeeId: "4001",
        password: "driver123",
        role: "driver",
        name: "سعد السائق",
        roleLabel: "Driver"
    },
    {
        employeeId: "5001",
        password: "mgmt123",
        role: "management",
        name: "خالد الإدارة",
        roleLabel: "Management"
    }
];

// ==================== عناصر الصفحة ====================
const loginForm = document.getElementById('loginForm');
const employeeIdInput = document.getElementById('employeeId');
const passwordInput = document.getElementById('password');
const roleSelect = document.getElementById('role');
const errorMessage = document.getElementById('errorMessage');
const togglePassword = document.getElementById('togglePassword');

// ==================== إظهار/إخفاء كلمة السر ====================
if (togglePassword) {
    togglePassword.addEventListener('click', function () {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePassword.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            togglePassword.textContent = '👁️';
        }
    });
}

// ==================== عرض الرسائل ====================
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('success');
    errorMessage.style.color = '#ef4444';
}

function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('success');
    errorMessage.style.color = '#10b981';
}

// ==================== معالجة تسجيل الدخول ====================
loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const employeeId = employeeIdInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;

    // التحقق من الحقول الفارغة
    if (!employeeId) {
        showError('❌ الرجاء إدخال رقم الموظف');
        return;
    }

    if (!password) {
        showError('❌ الرجاء إدخال كلمة السر');
        return;
    }

    if (!role) {
        showError('❌ الرجاء اختيار نوع المستخدم');
        return;
    }

    // تعطيل الزر مؤقتًا
    const submitBtn = loginForm.querySelector('.btn-login');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري التحقق...';

    // محاكاة وقت الاتصال بالخادم
    setTimeout(function () {
        // البحث عن المستخدم
        const user = users.find(u => u.employeeId === employeeId);

        // التحقق من وجود المستخدم
        if (!user) {
            showError('❌ رقم الموظف غير مسجل في النظام');
            submitBtn.disabled = false;
            submitBtn.textContent = 'دخول';
            return;
        }

        // التحقق من كلمة السر
        if (user.password !== password) {
            showError('❌ كلمة السر غير صحيحة');
            submitBtn.disabled = false;
            submitBtn.textContent = 'دخول';
            return;
        }

        // التحقق من الدور
        if (user.role !== role) {
            showError('❌ نوع المستخدم لا يطابق الحساب');
            submitBtn.disabled = false;
            submitBtn.textContent = 'دخول';
            return;
        }

        // نجاح الدخول
        showSuccess('✅ تم تسجيل الدخول بنجاح، جاري التحويل...');

        // حفظ بيانات المستخدم
        localStorage.setItem('currentUser', JSON.stringify({
            employeeId: user.employeeId,
            name: user.name,
            role: user.role,
            roleLabel: user.roleLabel,
            loginTime: new Date().toISOString()
        }));

        // التحويل بعد ثانية
        setTimeout(function () {
            window.location.href = 'index.html';
        }, 1000);

    }, 600);
});

// ==================== التحقق من الجلسة الحالية ====================
window.addEventListener('load', function () {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        console.log('يوجد مستخدم مسجل دخول حاليًا:', JSON.parse(currentUser));
    }
});
