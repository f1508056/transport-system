// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== متغيرات عامة ====================
let allVehicles = [];
let currentEditNumber = null;
let searchQuery = '';
let currentFilter = 'all';

// ==================== عناصر الصفحة ====================
const vehiclesList = document.getElementById('vehiclesList');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const availableCount = document.getElementById('availableCount');
const inUseCount = document.getElementById('inUseCount');
const maintenanceCount = document.getElementById('maintenanceCount');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// ==================== البيانات الافتراضية ====================
const DEFAULT_VEHICLES = [
    { number: 'V001', type: 'Sedan', make: 'تويوتا', model: 'كامري', color: 'أبيض', year: 2023, plate: 'أ ب ج 1234', status: 'Available' },
    { number: 'V002', type: 'SUV', make: 'هيونداي', model: 'توسان', color: 'أسود', year: 2022, plate: 'د هـ و 5678', status: 'Available' },
    { number: 'V003', type: 'SUV', make: 'نيسان', model: 'باترول', color: 'فضي', year: 2021, plate: 'ز ح ط 9012', status: 'Available' },
    { number: 'V004', type: 'Truck', make: 'تويوتا', model: 'هايلكس', color: 'أبيض', year: 2020, plate: 'ي ك ل 3456', status: 'Available' },
    { number: 'V005', type: 'Bus', make: 'مرسيدس', model: 'سبرينتر', color: 'رمادي', year: 2019, plate: 'م ن س 7890', status: 'Available' }
];

// ==================== تحميل البيانات ====================
function loadVehicles() {
    const stored = localStorage.getItem('transportVehicles');
    
    if (stored) {
        allVehicles = JSON.parse(stored);
    } else {
        allVehicles = [...DEFAULT_VEHICLES];
        saveVehicles();
    }
}

function saveVehicles() {
    localStorage.setItem('transportVehicles', JSON.stringify(allVehicles));
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    totalCount.textContent = allVehicles.length;
    availableCount.textContent = allVehicles.filter(v => v.status === 'Available').length;
    inUseCount.textContent = allVehicles.filter(v => v.status === 'In Use').length;
    maintenanceCount.textContent = allVehicles.filter(v => v.status === 'Maintenance').length;
}

// ==================== تصفية ====================
function getFilteredVehicles() {
    let filtered = allVehicles;

    // تصفية حسب الحالة
    if (currentFilter !== 'all') {
        filtered = filtered.filter(v => v.status === currentFilter);
    }

    // تصفية حسب البحث
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(v =>
            (v.number || '').toLowerCase().includes(q) ||
            (v.plate || '').toLowerCase().includes(q) ||
            (v.make || '').toLowerCase().includes(q) ||
            (v.model || '').toLowerCase().includes(q)
        );
    }

    return filtered;
}

// ==================== تنسيق ====================
function getStatusLabel(status) {
    const labels = {
        'Available': '✅ متاحة',
        'In Use': '🚗 مستخدمة',
        'Maintenance': '🔧 صيانة',
        'Out of Service': '🚫 خارج الخدمة'
    };
    return labels[status] || status;
}

function getTypeIcon(type) {
    const icons = {
        'Sedan': '🚗',
        'SUV': '🚙',
        'Ambulance': '🚑',
        'Truck': '🚚',
        'Bus': '🚌'
    };
    return icons[type] || '🚗';
}

function getTypeLabel(type) {
    const labels = {
        'Sedan': 'سيدان',
        'SUV': 'دفع رباعي',
        'Ambulance': 'إسعاف',
        'Truck': 'شاحنة',
        'Bus': 'باص'
    };
    return labels[type] || type;
}

// ==================== إنشاء بطاقة مركبة ====================
function createVehicleCard(vehicle) {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    card.setAttribute('data-status', vehicle.status);

    const statusLabel = getStatusLabel(vehicle.status);
    const typeIcon = getTypeIcon(vehicle.type);

    card.innerHTML = `
        <div class="vehicle-header">
            <div class="vehicle-icon">${typeIcon}</div>
            <div class="vehicle-info">
                <div class="vehicle-number">${vehicle.number}</div>
                <div class="vehicle-model">${vehicle.make || ''} ${vehicle.model || ''}</div>
            </div>
            <div class="status-badge" data-status="${vehicle.status}">${statusLabel}</div>
        </div>

        <div class="vehicle-body">
            <div class="info-item">
                <div class="info-label">🚗 النوع</div>
                <div class="info-value">${getTypeLabel(vehicle.type)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🎨 اللون</div>
                <div class="info-value">${vehicle.color || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">📅 سنة الصنع</div>
                <div class="info-value">${vehicle.year || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🏭 الشركة</div>
                <div class="info-value">${vehicle.make || '-'}</div>
            </div>
            <div class="info-item full-width plate">
                <div class="info-label">🔢 لوحة التسجيل</div>
                <div class="info-value">${vehicle.plate || '-'}</div>
            </div>
        </div>

        <div class="vehicle-actions">
            <button class="btn-action btn-edit" onclick="openEditModal('${vehicle.number}')">
                ✏️ تعديل
            </button>
            <button class="btn-action btn-status" onclick="openStatusModal('${vehicle.number}')">
                🔄 الحالة
            </button>
            <button class="btn-action btn-delete" onclick="openDeleteModal('${vehicle.number}')">
                🗑️ حذف
            </button>
        </div>
    `;

    return card;
}

// ==================== عرض المركبات ====================
function renderVehicles() {
    const filtered = getFilteredVehicles();
    vehiclesList.innerHTML = '';

    if (filtered.length === 0) {
        vehiclesList.style.display = 'none';
        emptyState.style.display = 'block';

        if (searchQuery || currentFilter !== 'all') {
            emptyState.querySelector('h2').textContent = 'لا توجد نتائج';
            emptyState.querySelector('p').textContent = 'جرب تغيير البحث أو التصفية';
        } else {
            emptyState.querySelector('h2').textContent = 'لا يوجد مركبات';
            emptyState.querySelector('p').textContent = 'ابدأ بإضافة مركبة جديدة';
        }
        return;
    }

    vehiclesList.style.display = 'flex';
    emptyState.style.display = 'none';

    filtered.forEach(vehicle => {
        vehiclesList.appendChild(createVehicleCard(vehicle));
    });
}

// ==================== فتح نافذة الإضافة ====================
function openAddModal() {
    currentEditNumber = null;
    modalTitle.textContent = '➕ إضافة مركبة جديدة';
    modalBody.innerHTML = buildVehicleForm();
    modalConfirmBtn.className = 'btn-confirm';
    modalConfirmBtn.textContent = '💾 إضافة';
    modal.style.display = 'flex';
}

// ==================== فتح نافذة التعديل ====================
function openEditModal(vehicleNumber) {
    const vehicle = allVehicles.find(v => v.number === vehicleNumber);
    if (!vehicle) return;

    currentEditNumber = vehicleNumber;
    modalTitle.textContent = '✏️ تعديل بيانات المركبة';
    modalBody.innerHTML = buildVehicleForm(vehicle);
    modalConfirmBtn.className = 'btn-confirm';
    modalConfirmBtn.textContent = '💾 حفظ التعديلات';
    modal.style.display = 'flex';
}

// ==================== نموذج المركبة ====================
function buildVehicleForm(vehicle = null) {
    const isEdit = !!vehicle;
    
    return `
        <label>🔢 رقم المركبة <span class="required">*</span></label>
        <input type="text" id="vehicleNumber" placeholder="مثال: V001" 
               value="${isEdit ? vehicle.number : ''}" 
               ${isEdit ? 'disabled' : ''} required>
        ${isEdit ? '<span class="hint">⚠️ رقم المركبة لا يمكن تعديله</span>' : ''}

        <label>🚗 نوع المركبة <span class="required">*</span></label>
        <select id="vehicleType" required>
            <option value="">-- اختر النوع --</option>
            <option value="Sedan" ${isEdit && vehicle.type === 'Sedan' ? 'selected' : ''}>Sedan - سيدان</option>
            <option value="SUV" ${isEdit && vehicle.type === 'SUV' ? 'selected' : ''}>SUV - دفع رباعي</option>
            <option value="Ambulance" ${isEdit && vehicle.type === 'Ambulance' ? 'selected' : ''}>Ambulance - إسعاف</option>
            <option value="Truck" ${isEdit && vehicle.type === 'Truck' ? 'selected' : ''}>Truck - شاحنة</option>
            <option value="Bus" ${isEdit && vehicle.type === 'Bus' ? 'selected' : ''}>Bus - باص</option>
        </select>

        <div class="form-row">
            <div class="form-group">
                <label>🏭 الشركة</label>
                <input type="text" id="vehicleMake" placeholder="مثال: تويوتا" 
                       value="${isEdit ? (vehicle.make || '') : ''}">
            </div>
            <div class="form-group">
                <label>🚙 الموديل</label>
                <input type="text" id="vehicleModel" placeholder="مثال: كامري" 
                       value="${isEdit ? (vehicle.model || '') : ''}">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>🎨 اللون</label>
                <input type="text" id="vehicleColor" placeholder="مثال: أبيض" 
                       value="${isEdit ? (vehicle.color || '') : ''}">
            </div>
            <div class="form-group">
                <label>📅 سنة الصنع</label>
                <input type="number" id="vehicleYear" placeholder="2023" min="1990" max="2099" 
                       value="${isEdit ? (vehicle.year || '') : ''}">
            </div>
        </div>

        <label>🔢 لوحة التسجيل <span class="required">*</span></label>
        <input type="text" id="vehiclePlate" placeholder="مثال: أ ب ج 1234" 
               value="${isEdit ? (vehicle.plate || '') : ''}" required>
    `;
}

// ==================== فتح نافذة تغيير الحالة ====================
function openStatusModal(vehicleNumber) {
    const vehicle = allVehicles.find(v => v.number === vehicleNumber);
    if (!vehicle) return;

    currentEditNumber = vehicleNumber;
    modalTitle.textContent = '🔄 تغيير حالة المركبة';
    modalBody.innerHTML = `
        <div style="background: var(--bg-light); padding: 14px; border-radius: 10px; margin-bottom: 16px; text-align: center;">
            <div style="font-size: 16px; font-weight: 700; color: var(--primary); font-family: monospace;">${vehicle.number}</div>
            <div style="font-size: 13px; color: var(--text-light); margin-top: 4px;">${vehicle.make} ${vehicle.model}</div>
        </div>
        
        <label>اختر الحالة الجديدة <span class="required">*</span></label>
        <div class="status-options">
            <div class="status-option">
                <input type="radio" name="vehicleStatus" id="statusAvailable" value="Available" ${vehicle.status === 'Available' ? 'checked' : ''}>
                <label for="statusAvailable" class="available">✅ متاحة</label>
            </div>
            <div class="status-option">
                <input type="radio" name="vehicleStatus" id="statusInUse" value="In Use" ${vehicle.status === 'In Use' ? 'checked' : ''}>
                <label for="statusInUse" class="inuse">🚗 مستخدمة</label>
            </div>
            <div class="status-option">
                <input type="radio" name="vehicleStatus" id="statusMaintenance" value="Maintenance" ${vehicle.status === 'Maintenance' ? 'checked' : ''}>
                <label for="statusMaintenance" class="maintenance">🔧 صيانة</label>
            </div>
            <div class="status-option">
                <input type="radio" name="vehicleStatus" id="statusOut" value="Out of Service" ${vehicle.status === 'Out of Service' ? 'checked' : ''}>
                <label for="statusOut" class="out">🚫 خارج الخدمة</label>
            </div>
        </div>
    `;
    modalConfirmBtn.className = 'btn-confirm';
    modalConfirmBtn.textContent = '💾 حفظ الحالة';
    modal.style.display = 'flex';
}

// ==================== فتح نافذة الحذف ====================
function openDeleteModal(vehicleNumber) {
    const vehicle = allVehicles.find(v => v.number === vehicleNumber);
    if (!vehicle) return;

    currentEditNumber = vehicleNumber;
    modalTitle.textContent = '🗑️ حذف المركبة';
    modalBody.innerHTML = `
        <p style="text-align:center; font-size:16px;">
            هل أنت متأكد من حذف هذه المركبة؟
        </p>
        <div style="background: #fee2e2; padding: 16px; border-radius: 10px; text-align:center; margin: 16px 0;">
            <div style="font-size: 18px; font-weight: 700; color: #991b1b; font-family: monospace;">${vehicle.number}</div>
            <div style="font-size: 14px; color: #991b1b; margin-top: 4px;">${vehicle.make} ${vehicle.model}</div>
            <div style="font-size: 13px; color: #991b1b; margin-top: 4px;">لوحة: ${vehicle.plate}</div>
        </div>
        <p style="text-align:center; font-size:13px; color:#6b7280;">
            ⚠️ لا يمكن التراجع عن هذا الإجراء
        </p>
    `;
    modalConfirmBtn.className = 'btn-confirm danger';
    modalConfirmBtn.textContent = '🗑️ حذف نهائياً';
    modal.style.display = 'flex';
}

// ==================== إغلاق النافذة ====================
function closeModal() {
    modal.style.display = 'none';
    currentEditNumber = null;
}

// ==================== حفظ (إضافة/تعديل/حالة/حذف) ====================
modalConfirmBtn.addEventListener('click', function () {
    const modalTitleText = modalTitle.textContent;

    // ============ حذف ============
    if (modalTitleText.includes('حذف')) {
        if (!currentEditNumber) return;
        allVehicles = allVehicles.filter(v => v.number !== currentEditNumber);
        saveVehicles();
        updateStats();
        renderVehicles();
        closeModal();
        showToast('🗑️ تم حذف المركبة');
        return;
    }

    // ============ تغيير الحالة ============
    if (modalTitleText.includes('تغيير حالة')) {
        if (!currentEditNumber) return;
        const selected = document.querySelector('input[name="vehicleStatus"]:checked');
        if (!selected) { alert('❌ يجب اختيار الحالة'); return; }

        const vehicle = allVehicles.find(v => v.number === currentEditNumber);
        if (!vehicle) return;

        vehicle.status = selected.value;
        saveVehicles();
        updateStats();
        renderVehicles();
        closeModal();
        showToast('✅ تم تحديث حالة المركبة');
        return;
    }

    // ============ إضافة / تعديل ============
    const number = document.getElementById('vehicleNumber').value.trim();
    const type = document.getElementById('vehicleType').value;
    const make = document.getElementById('vehicleMake').value.trim();
    const model = document.getElementById('vehicleModel').value.trim();
    const color = document.getElementById('vehicleColor').value.trim();
    const year = document.getElementById('vehicleYear').value;
    const plate = document.getElementById('vehiclePlate').value.trim();

    if (!number) { alert('❌ يجب إدخال رقم المركبة'); return; }
    if (!type) { alert('❌ يجب اختيار نوع المركبة'); return; }
    if (!plate) { alert('❌ يجب إدخال لوحة التسجيل'); return; }

    // تحقق من تكرار اللوحة
    const plateExists = allVehicles.find(v => 
        v.plate === plate && v.number !== currentEditNumber
    );
    if (plateExists) {
        alert('❌ لوحة التسجيل مسجلة مسبقاً للمركبة ' + plateExists.number);
        return;
    }

    // ============ إضافة جديدة ============
    if (!currentEditNumber) {
        if (allVehicles.find(v => v.number === number)) {
            alert('❌ رقم المركبة مسجل مسبقاً');
            return;
        }

        allVehicles.push({
            number: number,
            type: type,
            make: make || null,
            model: model || null,
            color: color || null,
            year: year ? parseInt(year) : null,
            plate: plate,
            status: 'Available',
            createdAt: new Date().toISOString()
        });

        saveVehicles();
        updateStats();
        renderVehicles();
        closeModal();
        showToast('✅ تم إضافة المركبة بنجاح');
    }

    // ============ تعديل ============
    else {
        const vehicle = allVehicles.find(v => v.number === currentEditNumber);
        if (!vehicle) return;

        vehicle.type = type;
        vehicle.make = make || null;
        vehicle.model = model || null;
        vehicle.color = color || null;
        vehicle.year = year ? parseInt(year) : null;
        vehicle.plate = plate;

        saveVehicles();
        updateStats();
        renderVehicles();
        closeModal();
        showToast('✅ تم حفظ التعديلات');
    }
});

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
    }, 2500);
}

// ==================== الأحداث ====================
document.addEventListener('DOMContentLoaded', function () {
    loadVehicles();
    updateStats();
    renderVehicles();

    searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderVehicles();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderVehicles();
        });
    });
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
