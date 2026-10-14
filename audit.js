// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== دالة تسجيل الأحداث (تُستخدم من كل الصفحات) ====================
// type: request | approval | driver | vehicle | trip | issue
// action: نص عربي وصفي
// reference: رقم الطلب / رقم الموظف / رقم المركبة
// details: كائن فيه تفاصيل إضافية (optional)
window.logAudit = function(type, action, reference, details = {}) {
    try {
        // جلب المستخدم الحالي (قد تكون الصفحة الاستدعائية حدّثت المتغير)
        const userStr = localStorage.getItem('currentUser');
        const user = userStr ? JSON.parse(userStr) : { employeeId: '?', name: 'غير معروف', roleLabel: '?' };

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

        // حد أقصى 500 حدث (لتجنب امتلاء localStorage)
        if (log.length > 500) {
            log.splice(0, log.length - 500);
        }

        localStorage.setItem('transportAuditLog', JSON.stringify(log));
    } catch (err) {
        console.error('خطأ في تسجيل الحدث:', err);
    }
};

// ==================== متغيرات عامة ====================
let allEvents = [];
let currentFilter = 'all';
let searchQuery = '';

// ==================== عناصر الصفحة ====================
const auditList = document.getElementById('auditList');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const todayCount = document.getElementById('todayCount');
const weekCount = document.getElementById('weekCount');
const searchInput = document.getElementById('searchInput');

// ==================== تحميل البيانات ====================
function loadEvents() {
    allEvents = JSON.parse(localStorage.getItem('transportAuditLog') || '[]');
    // ترتيب من الأحدث
    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ==================== الإحصائيات ====================
function updateStats() {
    totalCount.textContent = allEvents.length;

    // اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = allEvents.filter(e => new Date(e.timestamp) >= today);
    todayCount.textContent = todayEvents.length;

    // آخر 7 أيام
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEvents = allEvents.filter(e => new Date(e.timestamp) >= weekAgo);
    weekCount.textContent = weekEvents.length;
}

// ==================== تصفية ====================
function getFilteredEvents() {
    let filtered = allEvents;

    if (currentFilter !== 'all') {
        filtered = filtered.filter(e => e.type === currentFilter);
    }

    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(e =>
            (e.action || '').toLowerCase().includes(q) ||
            (e.userName || '').toLowerCase().includes(q) ||
            (e.userId || '').toLowerCase().includes(q) ||
            (e.reference || '').toLowerCase().includes(q)
        );
    }

    return filtered;
}

// ==================== تنسيق ====================
function formatTimestamp(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const period = h >= 12 ? 'م' : 'ص';
        const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${day}/${month}/${year} - ${displayHour}:${m} ${period}`;
    } catch { return '-'; }
}

function getTypeIcon(type) {
    const icons = {
        'request': '📝',
        'approval': '✅',
        'driver': '👤',
        'vehicle': '🚗',
        'trip': '🚙',
        'issue': '🚨'
    };
    return icons[type] || '📌';
}

function getTypeLabel(type) {
    const labels = {
        'request': 'طلب',
        'approval': 'اعتماد',
        'driver': 'سائق',
        'vehicle': 'مركبة',
        'trip': 'رحلة',
        'issue': 'بلاغ'
    };
    return labels[type] || type;
}

// ==================== إنشاء بطاقة حدث ====================
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'audit-card';
    card.setAttribute('data-type', event.type);

    const icon = getTypeIcon(event.type);

    // بناء التغييرات
    let changesHTML = '';
    if (event.details && event.details.oldValues && event.details.newValues) {
        const oldV = event.details.oldValues;
        const newV = event.details.newValues;
        let rows = '';

        if (oldV.date !== newV.date) rows += `<div class="audit-change-row">📅 التاريخ: <span class="audit-change-old">${oldV.date || '-'}</span> ← <span class="audit-change-new">${newV.date || '-'}</span></div>`;
        if (oldV.time !== newV.time) rows += `<div class="audit-change-row">🕐 الوقت: <span class="audit-change-old">${oldV.time || '-'}</span> ← <span class="audit-change-new">${newV.time || '-'}</span></div>`;
        if (oldV.driver !== newV.driver) rows += `<div class="audit-change-row">👤 السائق: <span class="audit-change-old">${oldV.driver || '-'}</span> ← <span class="audit-change-new">${newV.driver || '-'}</span></div>`;
        if (oldV.vehicle !== newV.vehicle) rows += `<div class="audit-change-row">🚗 المركبة: <span class="audit-change-old">${oldV.vehicle || '-'}</span> ← <span class="audit-change-new">${newV.vehicle || '-'}</span></div>`;
        if (oldV.status !== newV.status) rows += `<div class="audit-change-row">📊 الحالة: <span class="audit-change-old">${oldV.status || '-'}</span> ← <span class="audit-change-new">${newV.status || '-'}</span></div>`;

        if (rows) {
            changesHTML = `
                <div class="audit-changes">
                    <div class="audit-changes-title">🔀 التغييرات:</div>
                    ${rows}
                </div>
            `;
        }
    }

    // السبب
    let reasonHTML = '';
    if (event.details && event.details.reason) {
        reasonHTML = `
            <div class="audit-reason">
                <strong>📝 السبب:</strong>
                ${event.details.reason}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="audit-header">
            <div class="audit-icon">${icon}</div>
            <div class="audit-title">
                <div class="audit-action">${event.action || 'حدث'}</div>
                ${event.reference ? `<div class="audit-ref">${event.reference}</div>` : ''}
            </div>
        </div>

        <div class="audit-body">
            <div class="audit-row">
                <div class="audit-row-label">👤 المستخدم</div>
                <div class="audit-row-value">${event.userName} (${event.userId})</div>
            </div>

            <div class="audit-row">
                <div class="audit-row-label">🎭 الدور</div>
                <div class="audit-row-value">${event.userRole}</div>
            </div>

            <div class="audit-row">
                <div class="audit-row-label">🕐 الوقت</div>
                <div class="audit-row-value">${formatTimestamp(event.timestamp)}</div>
            </div>

            ${changesHTML}
            ${reasonHTML}
        </div>
    `;

    return card;
}

// ==================== عرض السجل ====================
function renderEvents() {
    const filtered = getFilteredEvents();
    auditList.innerHTML = '';

    if (filtered.length === 0) {
        auditList.style.display = 'none';
        emptyState.style.display = 'block';

        if (searchQuery || currentFilter !== 'all') {
            emptyState.querySelector('h2').textContent = 'لا توجد نتائج';
            emptyState.querySelector('p').textContent = 'جرب البحث أو التصفية';
        } else {
            emptyState.querySelector('h2').textContent = 'لا يوجد أحداث';
            emptyState.querySelector('p').textContent = 'لم يتم تسجيل أي عملية بعد';
        }
        return;
    }

    auditList.style.display = 'flex';
    emptyState.style.display = 'none';

    filtered.forEach(event => {
        auditList.appendChild(createEventCard(event));
    });
}

// ==================== الأحداث ====================
document.addEventListener('DOMContentLoaded', function () {
    loadEvents();
    updateStats();
    renderEvents();

    searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderEvents();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderEvents();
        });
    });
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
