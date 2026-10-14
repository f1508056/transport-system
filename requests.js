// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== متغيرات عامة ====================
let allRequests = [];
let currentFilter = 'all';
let searchQuery = '';

// ==================== عناصر الصفحة ====================
const requestsList = document.getElementById('requestsList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const totalCount = document.getElementById('totalCount');
const pendingCount = document.getElementById('pendingCount');
const approvedCount = document.getElementById('approvedCount');

// ==================== تحميل البيانات ====================
function loadRequests() {
    allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    // ترتيب من الأحدث للأقدم
    allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    totalCount.textContent = allRequests.length;
    
    const pending = allRequests.filter(r => r.status === 'pending_approval').length;
    pendingCount.textContent = pending;
    
    const approved = allRequests.filter(r => r.status === 'approved').length;
    approvedCount.textContent = approved;
}

// ==================== تصفية الطلبات ====================
function getFilteredRequests() {
    let filtered = allRequests;

    // تصفية حسب الحالة
    if (currentFilter !== 'all') {
        filtered = filtered.filter(r => r.status === currentFilter);
    }

    // تصفية حسب البحث
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(r =>
            (r.requestNumber || '').toLowerCase().includes(q) ||
            (r.department || '').toLowerCase().includes(q) ||
            (r.destination || '').toLowerCase().includes(q) ||
            (r.pickupLocation || '').toLowerCase().includes(q) ||
            (r.requesterId || '').toLowerCase().includes(q)
        );
    }

    return filtered;
}

// ==================== تنسيق التاريخ ====================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function formatTime(timeStr) {
    if (!timeStr) return '-';
    // الوقت بصيغة HH:MM
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'م' : 'ص';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayHour}:${minutes} ${period}`;
}

function formatDateTime(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        return d.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoStr;
    }
}

// ==================== إنشاء بطاقة طلب ====================
function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'request-card ' + (request.status || 'pending_approval');

    const statusLabel = request.statusLabel || getStatusLabel(request.status);

    card.innerHTML = `
        <div class="request-header">
            <div class="request-number">${request.requestNumber || 'REQ-???'}</div>
            <div class="status-badge ${request.status || 'pending_approval'}">${statusLabel}</div>
        </div>

        <div class="request-body">
            <div class="info-item">
                <div class="info-label">📅 تاريخ التنفيذ</div>
                <div class="info-value">${formatDate(request.requestDate)}</div>
            </div>

            <div class="info-item">
                <div class="info-label">🕐 وقت التنفيذ</div>
                <div class="info-value">${formatTime(request.requestTime)}</div>
            </div>

            <div class="info-item">
                <div class="info-label">🏢 الإدارة</div>
                <div class="info-value">${request.department || '-'}</div>
            </div>

            <div class="info-item">
                <div class="info-label">🚗 نوع المركبة</div>
                <div class="info-value">${request.vehicleType || '-'}</div>
            </div>

            <div class="info-item full-width">
                <div class="info-label">📍 من</div>
                <div class="info-value">${request.pickupLocation || '-'}</div>
            </div>

            <div class="info-item full-width">
                <div class="info-label">🎯 إلى</div>
                <div class="info-value">${request.destination || '-'}</div>
            </div>

            <div class="info-item">
                <div class="info-label">👥 الركاب</div>
                <div class="info-value">${request.passengers || '-'}</div>
            </div>

            <div class="info-item">
                <div class="info-label">📞 التواصل</div>
                <div class="info-value">${request.contactNumber || '-'}</div>
            </div>
        </div>

        <div class="request-footer">
            <div class="created-by">
                👤 ${request.createdByName || 'غير معروف'} (${request.createdBy || '-'})
            </div>
            <button class="btn-delete" onclick="deleteRequest('${request.requestNumber}')">
                🗑️ حذف
            </button>
        </div>
    `;

    return card;
}

// ==================== عرض الطلبات ====================
function renderRequests() {
    const filtered = getFilteredRequests();
    requestsList.innerHTML = '';

    if (filtered.length === 0) {
        requestsList.style.display = 'none';
        emptyState.style.display = 'block';

        // تعديل النص لو فيه بحث أو تصفية
        if (searchQuery || currentFilter !== 'all') {
            emptyState.querySelector('h2').textContent = 'لا توجد نتائج';
            emptyState.querySelector('p').textContent = 'جرب تغيير البحث أو التصفية';
        } else {
            emptyState.querySelector('h2').textContent = 'لا يوجد طلبات';
            emptyState.querySelector('p').textContent = 'لم يتم تسجيل أي طلبات حتى الآن';
        }
        return;
    }

    requestsList.style.display = 'flex';
    emptyState.style.display = 'none';

    filtered.forEach(request => {
        requestsList.appendChild(createRequestCard(request));
    });
}

// ==================== حالة نصية ====================
function getStatusLabel(status) {
    const labels = {
        'pending_approval': 'بانتظار الاعتماد',
        'approved': 'معتمد',
        'cancelled': 'ملغي',
        'in_progress': 'قيد التنفيذ',
        'completed': 'مكتمل'
    };
    return labels[status] || status || 'غير محدد';
}

// ==================== حذف طلب ====================
function deleteRequest(requestNumber) {
    if (!confirm('هل أنت متأكد من حذف الطلب ' + requestNumber + '؟')) {
        return;
    }

    allRequests = allRequests.filter(r => r.requestNumber !== requestNumber);
    localStorage.setItem('transportRequests', JSON.stringify(allRequests));

    updateStats();
    renderRequests();
}

// ==================== الأحداث ====================
document.addEventListener('DOMContentLoaded', function () {
    // تحميل وعرض
    loadRequests();
    updateStats();
    renderRequests();

    // أزرار التصفية
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderRequests();
        });
    });

    // البحث
    searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderRequests();
    });
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
