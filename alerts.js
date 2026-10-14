// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== متغيرات عامة ====================
let allAlerts = [];
let currentFilter = 'open';
let currentAlertNumber = null;

// ==================== عناصر الصفحة ====================
const alertsList = document.getElementById('alertsList');
const emptyState = document.getElementById('emptyState');
const openCount = document.getElementById('openCount');
const resolvedCount = document.getElementById('resolvedCount');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// ==================== تحميل البلاغات ====================
function loadAlerts() {
    const allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    
    allAlerts = allRequests.filter(r => r.issueReportedAt);
    allAlerts.sort((a, b) => new Date(b.issueReportedAt) - new Date(a.issueReportedAt));
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    const open = allAlerts.filter(a => a.status === 'issue_reported').length;
    openCount.textContent = open;
    
    const resolved = allAlerts.filter(a => a.status !== 'issue_reported').length;
    resolvedCount.textContent = resolved;
}

// ==================== تصفية ====================
function getFilteredAlerts() {
    if (currentFilter === 'all') return allAlerts;
    if (currentFilter === 'open') return allAlerts.filter(a => a.status === 'issue_reported');
    if (currentFilter === 'resolved') return allAlerts.filter(a => a.status !== 'issue_reported');
    return allAlerts;
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

function formatTimestamp(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const period = h >= 12 ? 'م' : 'ص';
        const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${day}/${month} - ${displayHour}:${m} ${period}`;
    } catch { return '-'; }
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

function getIssueTypeLabel(type) {
    const labels = {
        'mechanical': '🔧 عطل ميكانيكي',
        'electrical': '⚡ عطل كهربائي',
        'tire': '🛞 إطار مثقوب',
        'accident': '💥 حادث سير',
        'fuel': '⛽ نفاد وقود',
        'other': '❓ أخرى'
    };
    return labels[type] || type || 'غير محدد';
}

function getStatusLabel(status) {
    return status === 'issue_reported' ? '⚠️ مفتوح' : '✅ مُعالج';
}

// ==================== عرض صورة مكبرة ====================
function viewImage(tripNumber, imageIndex) {
    const trip = allAlerts.find(t => t.requestNumber === tripNumber);
    if (!trip || !trip.issueImages || !trip.issueImages[imageIndex]) return;

    const imgSrc = trip.issueImages[imageIndex];

    const overlay = document.createElement('div');
    overlay.className = 'image-lightbox';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
        <button class="lightbox-close" onclick="this.parentElement.remove()">✕</button>
        <img src="${imgSrc}" onclick="event.stopPropagation()">
        <div class="lightbox-counter">${imageIndex + 1} / ${trip.issueImages.length}</div>
    `;
    document.body.appendChild(overlay);
}

// ==================== إنشاء بطاقة بلاغ ====================
function createAlertCard(alert) {
    const card = document.createElement('div');
    const isResolved = alert.status !== 'issue_reported';
    card.className = 'alert-card ' + (isResolved ? 'resolved' : '');

    const statusLabel = getStatusLabel(alert.status);

    // الصور
    let imagesHTML = '';
    if (alert.issueImages && alert.issueImages.length > 0) {
        imagesHTML = `
            <div class="alert-images-box">
                <div class="alert-images-title">📷 صور العطل (${alert.issueImages.length})</div>
                <div class="alert-images-grid">
                    ${alert.issueImages.map((img, idx) => `
                        <img src="${img}" class="alert-thumb" onclick="viewImage('${alert.requestNumber}', ${idx})" alt="صورة العطل">
                    `).join('')}
                </div>
            </div>
        `;
    }

    // الأزرار حسب الحالة
    let actionButtons = '';
    if (!isResolved) {
        actionButtons = `
            <div class="alert-actions">
                <button class="btn-alert btn-new-request" onclick="openModal('new_request', '${alert.requestNumber}')">
                    ➕ إنشاء طلب بديل
                </button>
                <button class="btn-alert btn-resolve" onclick="openModal('resolve', '${alert.requestNumber}')">
                    ✅ إغلاق البلاغ
                </button>
            </div>
        `;
    } else {
        actionButtons = `
            <div class="resolved-note">
                ✅ تم إغلاق البلاغ
                ${alert.resolvedAt ? ' في ' + formatTimestamp(alert.resolvedAt) : ''}
            </div>
        `;
    }

    // الملاحظات
    const notesBox = alert.issueNotes ? `
        <div class="issue-notes-box">
            <strong>📝 ملاحظات السائق:</strong>
            ${alert.issueNotes}
        </div>
    ` : '';

    card.innerHTML = `
        <div class="alert-header">
            <div class="alert-number">${alert.requestNumber}</div>
            <div class="status-badge ${isResolved ? 'resolved' : 'open'}">${statusLabel}</div>
        </div>

        <div class="issue-type-box">
            <div class="issue-type-label">نوع البلاغ</div>
            <div class="issue-type-value">${getIssueTypeLabel(alert.issueType)}</div>
        </div>

        ${notesBox}
        ${imagesHTML}

        <div class="alert-body">
            <div class="info-item">
                <div class="info-label">👤 السائق</div>
                <div class="info-value">${alert.assignedDriver} - ${alert.issueReportedByName || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🚗 المركبة</div>
                <div class="info-value">${getVehicleName(alert.assignedVehicle)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🕐 وقت الإبلاغ</div>
                <div class="info-value">${formatTimestamp(alert.issueReportedAt)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">📅 تاريخ الرحلة</div>
                <div class="info-value">${formatDate(alert.requestDate)}</div>
            </div>
            <div class="info-item full-width highlight">
                <div class="info-label">📍 من</div>
                <div class="info-value">${alert.pickupLocation || '-'}</div>
            </div>
            <div class="info-item full-width highlight">
                <div class="info-label">🎯 إلى</div>
                <div class="info-value">${alert.destination || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🏢 الإدارة</div>
                <div class="info-value">${alert.department || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">📞 التواصل</div>
                <div class="info-value">${alert.contactNumber || '-'}</div>
            </div>
        </div>

        ${actionButtons}
    `;

    return card;
}

// ==================== عرض البلاغات ====================
function renderAlerts() {
    const filtered = getFilteredAlerts();
    alertsList.innerHTML = '';

    if (filtered.length === 0) {
        alertsList.style.display = 'none';
        emptyState.style.display = 'block';

        const messages = {
            'open': 'لا يوجد بلاغات مفتوحة حالياً',
            'resolved': 'لا يوجد بلاغات مُعالجة',
            'all': 'لا يوجد بلاغات في النظام'
        };
        document.getElementById('emptyMessage').textContent = messages[currentFilter] || 'لا يوجد بلاغات';
        return;
    }

    alertsList.style.display = 'flex';
    emptyState.style.display = 'none';

    filtered.forEach(alert => {
        alertsList.appendChild(createAlertCard(alert));
    });
}

// ==================== فتح النافذة ====================
function openModal(action, requestNumber) {
    currentAlertNumber = requestNumber;
    const alert = allAlerts.find(a => a.requestNumber === requestNumber);
    if (!alert) return;

    // ============ إنشاء طلب بديل ============
    if (action === 'new_request') {
        modalTitle.textContent = '➕ إنشاء طلب بديل';
        modalBody.innerHTML = `
            <div class="request-info-box">${alert.requestNumber}</div>
            <p>سيتم إنشاء طلب جديد بنفس بيانات الرحلة الحالية، مع إمكانية تحديد سائق ومركبة بديلين.</p>
            
            <label>👤 السائق الجديد <span class="required">*</span></label>
            <select id="newDriver">
                <option value="">-- اختر السائق --</option>
                <option value="4002">فهد السائق - 4002</option>
                <option value="4003">ماجد السائق - 4003</option>
                <option value="4001">سعد السائق - 4001</option>
            </select>

            <label>🚗 المركبة البديلة <span class="required">*</span></label>
            <select id="newVehicle">
                <option value="">-- اختر المركبة --</option>
                <option value="V002">V002 - هيونداي توسان</option>
                <option value="V003">V003 - نيسان باترول</option>
                <option value="V004">V004 - تويوتا هايلكس</option>
                <option value="V005">V005 - مرسيدس سبرينتر</option>
            </select>

            <label>📝 ملاحظات (اختياري)</label>
            <textarea id="newRequestNotes" placeholder="أي ملاحظات..."></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.textContent = '➕ إنشاء الطلب';
    }

    // ============ إغلاق البلاغ ============
    else if (action === 'resolve') {
        modalTitle.textContent = '✅ إغلاق البلاغ';
        modalBody.innerHTML = `
            <div class="request-info-box">${alert.requestNumber}</div>
            <p>هل أنت متأكد من إغلاق هذا البلاغ؟</p>
            <p style="font-size:13px; color:#6b7280;">
                ⚠️ الرحلة المرتبطة لن تُكمل، وستحتاج لإنشاء طلب بديل لو احتجت.
            </p>
            <label>📝 ملاحظات (اختياري)</label>
            <textarea id="resolveNotes" placeholder="ملاحظات عن المعالجة..."></textarea>
        `;
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.textContent = '✅ إغلاق';
    }

    modal.style.display = 'flex';
}

// ==================== إغلاق النافذة ====================
function closeModal() {
    modal.style.display = 'none';
    currentAlertNumber = null;
}

// ==================== تنفيذ الإجراء ====================
modalConfirmBtn.addEventListener('click', function () {
    if (!currentAlertNumber) return;

    const allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    const idx = allRequests.findIndex(r => r.requestNumber === currentAlertNumber);
    if (idx === -1) return;

    const alert = allRequests[idx];
    const now = new Date().toISOString();
    const modalTitleText = modalTitle.textContent;

    // ============ إنشاء طلب بديل ============
    if (modalTitleText.includes('إنشاء طلب بديل')) {
        const newDriver = document.getElementById('newDriver').value;
        const newVehicle = document.getElementById('newVehicle').value;
        const notes = document.getElementById('newRequestNotes').value.trim();

        if (!newDriver) { alert('❌ يجب اختيار السائق'); return; }
        if (!newVehicle) { alert('❌ يجب اختيار المركبة'); return; }

        const newRequest = {
            requestNumber: generateRequestNumber(),
            requestDate: alert.requestDate,
            requestTime: alert.requestTime,
            department: alert.department,
            requesterId: alert.requesterId,
            pickupLocation: alert.pickupLocation,
            destination: alert.destination,
            passengers: alert.passengers,
            vehicleType: alert.vehicleType,
            contactNumber: alert.contactNumber,
            notes: (notes ? notes + ' | ' : '') + 'طلب بديل عن ' + alert.requestNumber,
            status: 'approved',
            statusLabel: 'معتمد',
            createdBy: alert.createdBy,
            createdByName: alert.createdByName,
            createdAt: now,
            assignedDriver: newDriver,
            assignedVehicle: newVehicle,
            approvedBy: currentUser.employeeId,
            approvedByName: currentUser.name,
            approvedAt: now,
            replacementFor: alert.requestNumber,
            isReplacement: true
        };

        allRequests.push(newRequest);

        alert.status = 'resolved_replacement';
        alert.statusLabel = 'تم إغلاقه (طلب بديل)';
        alert.resolvedAt = now;
        alert.resolvedBy = currentUser.employeeId;
        alert.resolvedByName = currentUser.name;
        alert.replacementRequestNumber = newRequest.requestNumber;

        localStorage.setItem('transportRequests', JSON.stringify(allRequests));
        loadAlerts();
        updateStats();
        renderAlerts();
        closeModal();
        showToast('✅ تم إنشاء الطلب البديل: ' + newRequest.requestNumber);
    }

    // ============ إغلاق البلاغ ============
    else if (modalTitleText.includes('إغلاق البلاغ')) {
        const notes = document.getElementById('resolveNotes').value.trim();

        alert.status = 'resolved_closed';
        alert.statusLabel = 'مُعالج';
        alert.resolvedAt = now;
        alert.resolvedBy = currentUser.employeeId;
        alert.resolvedByName = currentUser.name;
        alert.resolveNotes = notes || null;

        localStorage.setItem('transportRequests', JSON.stringify(allRequests));
        loadAlerts();
        updateStats();
        renderAlerts();
        closeModal();
        showToast('✅ تم إغلاق البلاغ');
    }
});

// ==================== توليد رقم طلب ====================
function generateRequestNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `REQ-${year}${month}${day}-${random}`;
}

// ==================== إشعار سريع ====================
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%;
        transform: translateX(-50%);
        background: #1f2937; color: white;
        padding: 14px 24px; border-radius: 50px;
        font-size: 14px; font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 2000; animation: slideUp 0.3s;
        direction: rtl; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        text-align: center; max-width: 90%;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// ==================== الأحداث ====================
document.addEventListener('DOMContentLoaded', function () {
    loadAlerts();
    updateStats();
    renderAlerts();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderAlerts();
        });
    });
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
