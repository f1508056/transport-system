// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== متغيرات عامة ====================
let allRequests = [];
let currentFilter = 'pending_approval';
let currentAction = null;
let currentRequestNumber = null;

// ==================== عناصر الصفحة ====================
const requestsList = document.getElementById('requestsList');
const emptyState = document.getElementById('emptyState');
const pendingCount = document.getElementById('pendingCount');
const approvedCount = document.getElementById('approvedCount');
const returnedCount = document.getElementById('returnedCount');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// ==================== تحميل البيانات ====================
function loadRequests() {
    allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    const pending = allRequests.filter(r => r.status === 'pending_approval').length;
    pendingCount.textContent = pending;

    const approved = allRequests.filter(r => r.status === 'approved').length;
    approvedCount.textContent = approved;

    const returned = allRequests.filter(r => r.status === 'returned').length;
    returnedCount.textContent = returned;
}

// ==================== تصفية ====================
function getFilteredRequests() {
    if (currentFilter === 'all') return allRequests;
    return allRequests.filter(r => r.status === currentFilter);
}

// ==================== تنسيق ====================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch { return dateStr; }
}

function formatTime(timeStr) {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'م' : 'ص';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayHour}:${minutes} ${period}`;
}

function getStatusLabel(status) {
    const labels = {
        'pending_approval': 'بانتظار الاعتماد',
        'approved': 'معتمد',
        'returned': 'معاد للتعديل',
        'cancelled': 'ملغي',
        'in_progress': 'قيد التنفيذ',
        'completed': 'مكتمل'
    };
    return labels[status] || status;
}

// ==================== إنشاء بطاقة ====================
function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'request-card ' + (request.status || 'pending_approval');

    const statusLabel = getStatusLabel(request.status);

    // زر الاعتماد يظهر فقط للطلبات المعلقة
    const actionButtons = request.status === 'pending_approval' ? `
        <div class="action-buttons">
            <button class="btn-action btn-approve" onclick="openModal('approve', '${request.requestNumber}')">
                ✅ اعتماد
            </button>
            <button class="btn-action btn-return" onclick="openModal('return', '${request.requestNumber}')">
                ↩️ إعادة
            </button>
            <button class="btn-action btn-cancel-req" onclick="openModal('cancel', '${request.requestNumber}')">
                ❌ إلغاء
            </button>
        </div>
    ` : '';

    // ملاحظة السبب (لو موجودة)
    const reasonNote = request.reason ? `
        <div style="background: #fef3c7; padding: 10px 14px; border-radius: 10px; margin-top: 12px; font-size: 13px; color: #92400e;">
            <strong>📝 السبب:</strong> ${request.reason}
        </div>
    ` : '';

    card.innerHTML = `
        <div class="request-header">
            <div class="request-number">${request.requestNumber}</div>
            <div class="status-badge ${request.status}">${statusLabel}</div>
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

        ${reasonNote}
        ${actionButtons}
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

        const messages = {
            'pending_approval': 'لا يوجد طلبات بانتظار الاعتماد حالياً',
            'approved': 'لا يوجد طلبات معتمدة',
            'returned': 'لا يوجد طلبات معادة',
            'cancelled': 'لا يوجد طلبات ملغاة',
            'all': 'لا يوجد طلبات في النظام'
        };
        document.getElementById('emptyMessage').textContent = messages[currentFilter] || 'لا يوجد طلبات';
        return;
    }

    requestsList.style.display = 'flex';
    emptyState.style.display = 'none';

    filtered.forEach(request => {
        requestsList.appendChild(createRequestCard(request));
    });
}

// ==================== فتح النافذة ====================
function openModal(action, requestNumber) {
    currentAction = action;
    currentRequestNumber = requestNumber;

    const request = allRequests.find(r => r.requestNumber === requestNumber);
    if (!request) return;

    // تعيين العنوان
    const titles = {
        'approve': '✅ اعتماد الطلب',
        'return': '↩️ إعادة الطلب للتعديل',
        'cancel': '❌ إلغاء الطلب',
        'edit': '✏️ تعديل الموعد'
    };
    modalTitle.textContent = titles[action] || 'إجراء';

    // بناء المحتوى
    let bodyHTML = `
        <div class="request-info-box">${request.requestNumber}</div>
    `;

    if (action === 'approve') {
        bodyHTML += `
            <p>هل أنت متأكد من اعتماد هذا الطلب؟</p>
            <p style="font-size: 13px; color: #6b7280;">
                سيتم إشعار السائق والمركبة المقترحين.
            </p>
        `;
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.textContent = '✅ نعم، اعتمد';
    }
    else if (action === 'return') {
        bodyHTML += `
            <p>سيتم إعادة الطلب للمجدول للتعديل. يرجى إدخال السبب:</p>
            <label>سبب الإعادة <span class="required">*</span></label>
            <textarea id="reasonInput" placeholder="اكتب سبب الإعادة (مثال: الوقت غير مناسب، البيانات ناقصة...)"></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm info';
        modalConfirmBtn.textContent = '↩️ إعادة الطلب';
    }
    else if (action === 'cancel') {
        bodyHTML += `
            <p>سيتم إلغاء الطلب نهائياً. يرجى إدخال سبب الإلغاء:</p>
            <label>سبب الإلغاء <span class="required">*</span></label>
            <textarea id="reasonInput" placeholder="اكتب سبب الإلغاء (إلزامي)"></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm danger';
        modalConfirmBtn.textContent = '❌ إلغاء الطلب';
    }

    modalBody.innerHTML = bodyHTML;
    modal.style.display = 'flex';
}

// ==================== إغلاق النافذة ====================
function closeModal() {
    modal.style.display = 'none';
    currentAction = null;
    currentRequestNumber = null;
}

// ==================== تنفيذ الإجراء ====================
modalConfirmBtn.addEventListener('click', function () {
    if (!currentRequestNumber || !currentAction) return;

    const requestIndex = allRequests.findIndex(r => r.requestNumber === currentRequestNumber);
    if (requestIndex === -1) return;

    const request = allRequests[requestIndex];

    // ==================== اعتماد ====================
    if (currentAction === 'approve') {
        request.status = 'approved';
        request.statusLabel = 'معتمد';
        request.approvedBy = currentUser.employeeId;
        request.approvedByName = currentUser.name;
        request.approvedAt = new Date().toISOString();

        saveAndRefresh();
        closeModal();
        showToast('✅ تم اعتماد الطلب بنجاح');
    }

    // ==================== إعادة ====================
    else if (currentAction === 'return') {
        const reason = document.getElementById('reasonInput').value.trim();
        if (!reason) {
            alert('❌ يجب إدخال سبب الإعادة');
            return;
        }

        request.status = 'returned';
        request.statusLabel = 'معاد للتعديل';
        request.reason = reason;
        request.returnedBy = currentUser.employeeId;
        request.returnedByName = currentUser.name;
        request.returnedAt = new Date().toISOString();

        saveAndRefresh();
        closeModal();
        showToast('↩️ تم إعادة الطلب للتعديل');
    }

    // ==================== إلغاء ====================
    else if (currentAction === 'cancel') {
        const reason = document.getElementById('reasonInput').value.trim();
        if (!reason) {
            alert('❌ يجب إدخال سبب الإلغاء');
            return;
        }

        request.status = 'cancelled';
        request.statusLabel = 'ملغي';
        request.reason = reason;
        request.cancelledBy = currentUser.employeeId;
        request.cancelledByName = currentUser.name;
        request.cancelledAt = new Date().toISOString();

        saveAndRefresh();
        closeModal();
        showToast('❌ تم إلغاء الطلب');
    }
});

// ==================== حفظ وتحديث ====================
function saveAndRefresh() {
    localStorage.setItem('transportRequests', JSON.stringify(allRequests));
    updateStats();
    renderRequests();
}

// ==================== إشعار سريع ====================
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: white;
        padding: 14px 24px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 2000;
        animation: slideUp 0.3s;
        direction: rtl;
        font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ==================== الأحداث ====================
document.addEventListener('DOMContentLoaded', function () {
    loadRequests();
    updateStats();
    renderRequests();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderRequests();
        });
    });
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
