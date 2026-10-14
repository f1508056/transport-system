// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== متغيرات عامة ====================
let myTrips = [];
let currentFilter = 'assigned';
let currentAction = null;
let currentTripNumber = null;

// ==================== عناصر الصفحة ====================
const tripsList = document.getElementById('tripsList');
const emptyState = document.getElementById('emptyState');
const assignedCount = document.getElementById('assignedCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// ==================== تحميل البيانات ====================
function loadTrips() {
    const allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    
    // تصفية الرحلات المسندة لهذا السائق فقط
    myTrips = allRequests.filter(r => 
        r.assignedDriver === currentUser.employeeId && 
        r.status === 'approved' ||  // معتمدة
        (r.assignedDriver === currentUser.employeeId && r.status === 'in_progress') ||  // قيد التنفيذ
        (r.assignedDriver === currentUser.employeeId && r.status === 'completed')  // مكتملة
    );

    // ترتيب حسب التاريخ
    myTrips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    assignedCount.textContent = myTrips.filter(t => t.status === 'approved').length;
    activeCount.textContent = myTrips.filter(t => t.status === 'in_progress').length;
    completedCount.textContent = myTrips.filter(t => t.status === 'completed').length;
}

// ==================== تصفية ====================
function getFilteredTrips() {
    if (currentFilter === 'all') return myTrips;
    return myTrips.filter(t => t.status === currentFilter);
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
        'approved': 'جاهزة للبدء',
        'in_progress': 'قيد التنفيذ',
        'completed': 'مكتملة'
    };
    return labels[status] || status;
}

function getVehicleName(vehicleNumber) {
    const vehicles = {
        'V001': 'تويوتا كامري',
        'V002': 'هيونداي توسان',
        'V003': 'نيسان باترول',
        'V004': 'تويوتا هايلكس',
        'V005': 'مرسيدس سبرينتر'
    };
    return vehicles[vehicleNumber] || vehicleNumber || '-';
}

// ==================== إنشاء بطاقة ====================
function createTripCard(trip) {
    const card = document.createElement('div');
    card.className = 'trip-card ' + (trip.status || 'assigned');

    const statusLabel = getStatusLabel(trip.status);

    // أزرار الإجراءات حسب الحالة
    let actionButtons = '';
    
    if (trip.status === 'approved') {
        actionButtons = `
            <div class="trip-actions">
                <button class="btn-trip btn-start-trip" onclick="openModal('start', '${trip.requestNumber}')">
                    🚀 بدء الرحلة
                </button>
            </div>
        `;
    } else if (trip.status === 'in_progress') {
        actionButtons = `
            <div class="trip-actions">
                <button class="btn-trip btn-continue-trip" onclick="openModal('continue', '${trip.requestNumber}')">
                    📍 تحديث الموقع / المتابعة
                </button>
                <button class="btn-trip btn-complete-trip" onclick="openModal('complete', '${trip.requestNumber}')">
                    ✅ إنهاء الرحلة
                </button>
            </div>
        `;
    } else if (trip.status === 'completed') {
        actionButtons = `
            <div class="completed-note">
                ✅ تم إنهاء هذه الرحلة بنجاح
            </div>
        `;
    }

    card.innerHTML = `
        <div class="trip-header">
            <div class="trip-number">${trip.requestNumber}</div>
            <div class="status-badge ${trip.status || 'assigned'}">${statusLabel}</div>
        </div>

        <div class="trip-body">
            <div class="info-item">
                <div class="info-label">📅 التاريخ</div>
                <div class="info-value">${formatDate(trip.requestDate)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🕐 الوقت</div>
                <div class="info-value">${formatTime(trip.requestTime)}</div>
            </div>
            <div class="info-item full-width highlight">
                <div class="info-label">📍 مكان الالتقاط</div>
                <div class="info-value">${trip.pickupLocation || '-'}</div>
            </div>
            <div class="info-item full-width highlight">
                <div class="info-label">🎯 الوجهة</div>
                <div class="info-value">${trip.destination || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">👥 الركاب</div>
                <div class="info-value">${trip.passengers || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">📞 التواصل</div>
                <div class="info-value">${trip.contactNumber || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🚗 المركبة</div>
                <div class="info-value">${getVehicleName(trip.assignedVehicle)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🏢 الإدارة</div>
                <div class="info-value">${trip.department || '-'}</div>
            </div>
        </div>

        ${actionButtons}
    `;

    return card;
}

// ==================== عرض الرحلات ====================
function renderTrips() {
    const filtered = getFilteredTrips();
    tripsList.innerHTML = '';

    if (filtered.length === 0) {
        tripsList.style.display = 'none';
        emptyState.style.display = 'block';

        const messages = {
            'assigned': 'لا يوجد رحلات جاهزة للبدء',
            'in_progress': 'لا يوجد رحلات قيد التنفيذ',
            'completed': 'لا يوجد رحلات مكتملة',
            'all': 'لا يوجد رحلات مسندة إليك'
        };
        document.getElementById('emptyMessage').textContent = messages[currentFilter] || 'لا يوجد رحلات';
        return;
    }

    tripsList.style.display = 'flex';
    emptyState.style.display = 'none';

    filtered.forEach(trip => {
        tripsList.appendChild(createTripCard(trip));
    });
}

// ==================== فتح النافذة ====================
function openModal(action, tripNumber) {
    currentAction = action;
    currentTripNumber = tripNumber;

    const trip = myTrips.find(t => t.requestNumber === tripNumber);
    if (!trip) return;

    const titles = {
        'start': '🚀 بدء الرحلة',
        'continue': '📍 تحديث الموقع',
        'complete': '✅ إنهاء الرحلة'
    };
    modalTitle.textContent = titles[action] || 'إجراء';

    let bodyHTML = `
        <div class="request-info-box">${trip.requestNumber}</div>
    `;

    // بدء الرحلة
    if (action === 'start') {
        bodyHTML += `
            <p>هل أنت جاهز لبدء الرحلة؟</p>
            <p style="font-size: 13px; color: #6b7280; margin-bottom: 14px;">
                📍 من: ${trip.pickupLocation}<br>
                🎯 إلى: ${trip.destination}
            </p>
            <label>عداد الكيلومترات عند البدء <span class="required">*</span></label>
            <input type="number" id="startOdometer" placeholder="مثال: 45600" min="0" required>
            <small class="hint">سجّل قراءة العداد الحالية</small>
        `;
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.textContent = '🚀 بدء الرحلة';
    }

    // تحديث الموقع (متابعة)
    else if (action === 'continue') {
        bodyHTML += `
            <p>📍 أنت في رحلة نشطة</p>
            <p style="font-size: 13px; color: #6b7280; margin-bottom: 14px;">
                تم بدء الرحلة في: ${trip.startedAt ? new Date(trip.startedAt).toLocaleString('ar-SA') : '-'}
            </p>
            <div style="background: #fef3c7; padding: 12px 14px; border-radius: 10px; font-size: 13px; color: #92400e; margin-bottom: 14px;">
                ⚠️ <strong>ملاحظة:</strong> تتبع GPS سيتم إضافته لاحقًا في المرحلة القادمة.
            </div>
            <p style="font-size: 13px; color: #6b7280;">
                يمكنك الاستمرار حتى تصل إلى الوجهة، ثم اضغط "إنهاء الرحلة".
            </p>
        `;
        modalConfirmBtn.className = 'btn-confirm warning';
        modalConfirmBtn.textContent = 'حسنًا';
    }

    // إنهاء الرحلة
    else if (action === 'complete') {
        bodyHTML += `
            <p>هل وصلت إلى الوجهة وأنهيت الرحلة؟</p>
            <label>عداد الكيلومترات عند النهاية <span class="required">*</span></label>
            <input type="number" id="endOdometer" placeholder="مثال: 45650" min="0" required>
            <small class="hint">قراءة العداد عند نهاية الرحلة</small>
            
            <label>ملاحظات (اختياري)</label>
            <textarea id="tripNotes" placeholder="أي ملاحظات عن الرحلة..."></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.textContent = '✅ إنهاء الرحلة';
    }

    modalBody.innerHTML = bodyHTML;
    modal.style.display = 'flex';
}

// ==================== إغلاق النافذة ====================
function closeModal() {
    modal.style.display = 'none';
    currentAction = null;
    currentTripNumber = null;
}

// ==================== تنفيذ الإجراء ====================
modalConfirmBtn.addEventListener('click', function () {
    if (!currentTripNumber || !currentAction) return;

    const allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    const tripIndex = allRequests.findIndex(t => t.requestNumber === currentTripNumber);
    if (tripIndex === -1) return;

    const trip = allRequests[tripIndex];

    // ==================== بدء الرحلة ====================
    if (currentAction === 'start') {
        const odometer = document.getElementById('startOdometer').value;
        if (!odometer) { alert('❌ يجب إدخال قراءة العداد'); return; }

        trip.status = 'in_progress';
        trip.statusLabel = 'قيد التنفيذ';
        trip.startedAt = new Date().toISOString();
        trip.startOdometer = parseFloat(odometer);
        trip.startedBy = currentUser.employeeId;
        trip.startedByName = currentUser.name;

        saveAndRefresh(allRequests);
        closeModal();
        showToast('🚀 تم بدء الرحلة بنجاح');
    }

    // ==================== متابعة ====================
    else if (currentAction === 'continue') {
        closeModal();
        showToast('📍 الرحلة نشطة، بالتوفيق!');
    }

    // ==================== إنهاء الرحلة ====================
    else if (currentAction === 'complete') {
        const odometer = document.getElementById('endOdometer').value;
        const notes = document.getElementById('tripNotes').value.trim();

        if (!odometer) { alert('❌ يجب إدخال قراءة العداد النهائية'); return; }

        // التحقق: العداد النهائي أكبر من الابتدائي
        if (trip.startOdometer && parseFloat(odometer) < trip.startOdometer) {
            alert('❌ قراءة العداد النهائية يجب أن تكون أكبر من أو تساوي الابتدائية');
            return;
        }

        trip.status = 'completed';
        trip.statusLabel = 'مكتملة';
        trip.completedAt = new Date().toISOString();
        trip.endOdometer = parseFloat(odometer);
        trip.distance = trip.startOdometer ? (trip.endOdometer - trip.startOdometer) : null;
        trip.tripNotes = notes;
        trip.completedBy = currentUser.employeeId;
        trip.completedByName = currentUser.name;

        saveAndRefresh(allRequests);
        closeModal();
        showToast('✅ تم إنهاء الرحلة بنجاح');
    }
});

// ==================== حفظ وتحديث ====================
function saveAndRefresh(allRequests) {
    localStorage.setItem('transportRequests', JSON.stringify(allRequests));
    loadTrips();
    updateStats();
    renderTrips();
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
    // عرض بيانات السائق
    document.getElementById('driverName').textContent = currentUser.name || 'السائق';
    document.getElementById('driverId').textContent = 'رقم الموظف: ' + (currentUser.employeeId || '-');

    loadTrips();
    updateStats();
    renderTrips();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderTrips();
        });
    });
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
