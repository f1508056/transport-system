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

// قوائم السائقين والمركبات (تجريبية - لاحقًا من قاعدة البيانات)
const AVAILABLE_DRIVERS = [
    { id: '4001', name: 'سعد السائق' },
    { id: '4002', name: 'فهد السائق' },
    { id: '4003', name: 'ماجد السائق' }
];

const AVAILABLE_VEHICLES = [
    { number: 'V001', name: 'تويوتا كامري', type: 'Sedan' },
    { number: 'V002', name: 'هيونداي توسان', type: 'SUV' },
    { number: 'V003', name: 'نيسان باترول', type: 'SUV' },
    { number: 'V004', name: 'تويوتا هايلكس', type: 'Truck' },
    { number: 'V005', name: 'مرسيدس سبرينتر', type: 'Bus' }
];

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

function getDriverName(driverId) {
    if (!driverId) return null;
    const driver = AVAILABLE_DRIVERS.find(d => d.id === driverId);
    return driver ? driver.name : driverId;
}

function getVehicleName(vehicleNumber) {
    if (!vehicleNumber) return null;
    const vehicle = AVAILABLE_VEHICLES.find(v => v.number === vehicleNumber);
    return vehicle ? vehicle.name : vehicleNumber;
}

// ==================== إنشاء بطاقة ====================
function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'request-card ' + (request.status || 'pending_approval');

    const statusLabel = getStatusLabel(request.status);

    // تحقق من وجود سائق ومركبة
    const hasDriver = !!request.assignedDriver;
    const hasVehicle = !!request.assignedVehicle;
    const isReadyToApprove = hasDriver && hasVehicle;

    // عرض بيانات التعيين (لو موجودة)
    let assignmentInfo = '';
    if (hasDriver || hasVehicle) {
        assignmentInfo = `
            <div style="background: #ecfdf5; padding: 12px 14px; border-radius: 10px; margin-top: 12px; border-right: 4px solid #10b981;">
                <div style="font-size: 12px; color: #065f46; font-weight: 700; margin-bottom: 6px;">✅ تم التعيين</div>
                ${hasDriver ? `<div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">👤 السائق: <strong>${getDriverName(request.assignedDriver)}</strong></div>` : ''}
                ${hasVehicle ? `<div style="font-size: 13px; color: #1f2937;">🚗 المركبة: <strong>${getVehicleName(request.assignedVehicle)}</strong> (${request.assignedVehicle})</div>` : ''}
            </div>
        `;
    }

    // ملاحظة السبب
    const reasonNote = request.reason ? `
        <div style="background: #fef3c7; padding: 10px 14px; border-radius: 10px; margin-top: 12px; font-size: 13px; color: #92400e;">
            <strong>📝 السبب:</strong> ${request.reason}
        </div>
    ` : '';

    // أزرار الإجراءات (للطلبات المعلقة)
    let actionButtons = '';
    if (request.status === 'pending_approval') {
        // زر الاعتماد: يظهر بس لو فيه سائق ومركبة
        const approveBtn = isReadyToApprove
            ? `<button class="btn-action btn-approve" onclick="openModal('approve', '${request.requestNumber}')">
                   ✅ اعتماد
               </button>`
            : `<button class="btn-action" style="background: #9ca3af; color: white; cursor: not-allowed;" onclick="alert('⚠️ يجب تحديد السائق والمركبة أولاً')">
                   ✅ اعتماد
               </button>`;

        actionButtons = `
            <div class="action-buttons" style="grid-template-columns: repeat(4, 1fr);">
                <button class="btn-action" style="background: #f59e0b; color: white;" onclick="openModal('edit', '${request.requestNumber}')">
                    ✏️ تعديل
                </button>
                ${approveBtn}
                <button class="btn-action btn-return" onclick="openModal('return', '${request.requestNumber}')">
                    ↩️ إعادة
                </button>
                <button class="btn-action btn-cancel-req" onclick="openModal('cancel', '${request.requestNumber}')">
                    ❌ إلغاء
                </button>
            </div>
        `;
    }

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
                <div class="info-label">🚗 نوع المركبة المطلوب</div>
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

        ${assignmentInfo}
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

    const titles = {
        'approve': '✅ اعتماد الطلب',
        'return': '↩️ إعادة الطلب للتعديل',
        'cancel': '❌ إلغاء الطلب',
        'edit': '✏️ تعديل الطلب (السائق والمركبة والموعد)'
    };
    modalTitle.textContent = titles[action] || 'إجراء';

    let bodyHTML = `
        <div class="request-info-box">${request.requestNumber}</div>
    `;

    if (action === 'approve') {
        bodyHTML += `
            <p>هل أنت متأكد من اعتماد هذا الطلب؟</p>
            <div style="background: #ecfdf5; padding: 12px 14px; border-radius: 10px; font-size: 13px; color: #065f46;">
                <div style="margin-bottom: 6px;">👤 <strong>السائق:</strong> ${getDriverName(request.assignedDriver)}</div>
                <div>🚗 <strong>المركبة:</strong> ${getVehicleName(request.assignedVehicle)} (${request.assignedVehicle})</div>
            </div>
        `;
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.textContent = '✅ نعم، اعتمد';
    }
    else if (action === 'edit') {
        const driverOptions = AVAILABLE_DRIVERS.map(d => 
            `<option value="${d.id}" ${request.assignedDriver === d.id ? 'selected' : ''}>
                ${d.name} - ${d.id}
            </option>`
        ).join('');

        const vehicleOptions = AVAILABLE_VEHICLES.map(v => 
            `<option value="${v.number}" ${request.assignedVehicle === v.number ? 'selected' : ''}>
                ${v.number} - ${v.name} (${v.type})
            </option>`
        ).join('');

        bodyHTML += `
            <p style="font-size: 13px; color: #6b7280; margin-bottom: 14px;">
                عدّل البيانات التالية ثم احفظ. <span style="color: #ef4444;">*</span> = إلزامي
            </p>

            <label>📅 تاريخ التنفيذ <span class="required">*</span></label>
            <input type="date" id="editDate" value="${request.requestDate || ''}" style="margin-bottom: 14px;">

            <label>🕐 وقت التنفيذ <span class="required">*</span></label>
            <input type="time" id="editTime" value="${request.requestTime || ''}" style="margin-bottom: 14px;">

            <label>👤 السائق المُعيَّن <span class="required">*</span></label>
            <select id="editDriver" style="width: 100%; padding: 12px 14px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px; font-family: inherit; background: #f3f4f6; margin-bottom: 14px;">
                <option value="">-- اختر السائق --</option>
                ${driverOptions}
            </select>

            <label>🚗 رقم المركبة <span class="required">*</span></label>
            <select id="editVehicle" style="width: 100%; padding: 12px 14px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px; font-family: inherit; background: #f3f4f6; margin-bottom: 14px;">
                <option value="">-- اختر المركبة --</option>
                ${vehicleOptions}
            </select>

            <label>📝 سبب التعديل (اختياري)</label>
            <textarea id="editReason" placeholder="اكتب سبب التعديل..." style="margin-bottom: 0;"></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.style.background = '#f59e0b';
        modalConfirmBtn.textContent = '💾 حفظ التعديلات';
    }
    else if (action === 'return') {
        bodyHTML += `
            <p>سيتم إعادة الطلب للمجدول للتعديل. يرجى إدخال السبب:</p>
            <label>سبب الإعادة <span class="required">*</span></label>
            <textarea id="reasonInput" placeholder="اكتب سبب الإعادة (مثال: الوقت غير مناسب، البيانات ناقصة...)"></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm info';
        modalConfirmBtn.style.background = '';
        modalConfirmBtn.textContent = '↩️ إعادة الطلب';
    }
    else if (action === 'cancel') {
        bodyHTML += `
            <p>سيتم إلغاء الطلب نهائياً. يرجى إدخال سبب الإلغاء:</p>
            <label>سبب الإلغاء <span class="required">*</span></label>
            <textarea id="reasonInput" placeholder="اكتب سبب الإلغاء (إلزامي)"></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm danger';
        modalConfirmBtn.style.background = '';
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
    modalConfirmBtn.style.background = '';
}

// ==================== تنفيذ الإجراء ====================
modalConfirmBtn.addEventListener('click', function () {
    if (!currentRequestNumber || !currentAction) return;

    const requestIndex = allRequests.findIndex(r => r.requestNumber === currentRequestNumber);
    if (requestIndex === -1) return;

    const request = allRequests[requestIndex];

    // ==================== اعتماد ====================
    if (currentAction === 'approve') {
        if (!request.assignedDriver || !request.assignedVehicle) {
            alert('❌ لا يمكن الاعتماد: يجب تحديد السائق والمركبة أولاً');
            return;
        }

        request.status = 'approved';
        request.statusLabel = 'معتمد';
        request.approvedBy = currentUser.employeeId;
        request.approvedByName = currentUser.name;
        request.approvedAt = new Date().toISOString();

        saveAndRefresh();
        closeModal();
        showToast('✅ تم اعتماد الطلب بنجاح');
    }

    // ==================== تعديل ====================
    else if (currentAction === 'edit') {
        const newDate = document.getElementById('editDate').value;
        const newTime = document.getElementById('editTime').value;
        const newDriver = document.getElementById('editDriver').value;
        const newVehicle = document.getElementById('editVehicle').value;
        const reason = document.getElementById('editReason').value.trim();

        // التحقق من الإلزامي (سبب التعديل اختياري)
        if (!newDate) { alert('❌ يجب تحديد تاريخ التنفيذ'); return; }
        if (!newTime) { alert('❌ يجب تحديد وقت التنفيذ'); return; }
        if (!newDriver) { alert('❌ يجب اختيار السائق'); return; }
        if (!newVehicle) { alert('❌ يجب اختيار المركبة'); return; }

        // حفظ القيم القديمة للسجل
        const oldValues = {
            date: request.requestDate,
            time: request.requestTime,
            driver: request.assignedDriver,
            vehicle: request.assignedVehicle
        };

        // تطبيق التعديلات
        request.requestDate = newDate;
        request.requestTime = newTime;
        request.assignedDriver = newDriver;
        request.assignedVehicle = newVehicle;

        // سجل التعديل
        if (!request.editHistory) request.editHistory = [];
        request.editHistory.push({
            editedBy: currentUser.employeeId,
            editedByName: currentUser.name,
            editedAt: new Date().toISOString(),
            reason: reason || '(بدون سبب)',
            oldValues: oldValues,
            newValues: { date: newDate, time: newTime, driver: newDriver, vehicle: newVehicle }
        });

        saveAndRefresh();
        closeModal();
        showToast('✏️ تم حفظ التعديلات بنجاح');
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
