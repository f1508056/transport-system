// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== متغيرات عامة ====================
let allDrivers = [];
let currentEditId = null;
let searchQuery = '';

// ==================== عناصر الصفحة ====================
const driversList = document.getElementById('driversList');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const activeCount = document.getElementById('activeCount');
const inactiveCount = document.getElementById('inactiveCount');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// ==================== البيانات الافتراضية ====================
const DEFAULT_DRIVERS = [
    { id: '4001', name: 'سعد السائق', phone: '0501111111', license: 'LIC-4001', active: true },
    { id: '4002', name: 'فهد السائق', phone: '0502222222', license: 'LIC-4002', active: true },
    { id: '4003', name: 'ماجد السائق', phone: '0503333333', license: 'LIC-4003', active: true }
];

// ==================== تحميل البيانات ====================
function loadDrivers() {
    const stored = localStorage.getItem('transportDrivers');
    
    if (stored) {
        allDrivers = JSON.parse(stored);
    } else {
        // أول مرة — نحمل الافتراضيين
        allDrivers = [...DEFAULT_DRIVERS];
        saveDrivers();
    }
}

function saveDrivers() {
    localStorage.setItem('transportDrivers', JSON.stringify(allDrivers));
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    totalCount.textContent = allDrivers.length;
    activeCount.textContent = allDrivers.filter(d => d.active).length;
    inactiveCount.textContent = allDrivers.filter(d => !d.active).length;
}

// ==================== تصفية ====================
function getFilteredDrivers() {
    if (!searchQuery.trim()) return allDrivers;
    
    const q = searchQuery.trim().toLowerCase();
    return allDrivers.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.phone && d.phone.includes(q))
    );
}

// ==================== إنشاء بطاقة سائق ====================
function createDriverCard(driver) {
    const card = document.createElement('div');
    card.className = 'driver-card ' + (driver.active ? '' : 'inactive');

    const initial = driver.name.charAt(0) || '؟';

    // زر التفعيل/التعطيل
    const toggleBtn = driver.active
        ? `<button class="btn-action btn-toggle" onclick="toggleDriver('${driver.id}')">🚫 تعطيل</button>`
        : `<button class="btn-action btn-toggle activate" onclick="toggleDriver('${driver.id}')">✅ تفعيل</button>`;

    card.innerHTML = `
        <div class="driver-header">
            <div class="driver-avatar">${initial}</div>
            <div class="driver-info">
                <div class="driver-name">${driver.name}</div>
                <div class="driver-id">${driver.id}</div>
            </div>
            <div class="status-badge ${driver.active ? 'active' : 'inactive'}">
                ${driver.active ? '✅ نشط' : '🚫 معطّل'}
            </div>
        </div>

        <div class="driver-body">
            <div class="info-item">
                <div class="info-label">📞 رقم الجوال</div>
                <div class="info-value">${driver.phone || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">🪪 رقم الرخصة</div>
                <div class="info-value">${driver.license || '-'}</div>
            </div>
        </div>

        <div class="driver-actions">
            <button class="btn-action btn-edit" onclick="openEditModal('${driver.id}')">
                ✏️ تعديل
            </button>
            ${toggleBtn}
            <button class="btn-action btn-delete" onclick="openDeleteModal('${driver.id}')">
                🗑️ حذف
            </button>
        </div>
    `;

    return card;
}

// ==================== عرض السائقين ====================
function renderDrivers() {
    const filtered = getFilteredDrivers();
    driversList.innerHTML = '';

    if (filtered.length === 0) {
        driversList.style.display = 'none';
        emptyState.style.display = 'block';

        if (searchQuery) {
            emptyState.querySelector('h2').textContent = 'لا توجد نتائج';
            emptyState.querySelector('p').textContent = 'جرب البحث بكلمة أخرى';
        } else {
            emptyState.querySelector('h2').textContent = 'لا يوجد سائقون';
            emptyState.querySelector('p').textContent = 'ابدأ بإضافة سائق جديد';
        }
        return;
    }

    driversList.style.display = 'flex';
    emptyState.style.display = 'none';

    filtered.forEach(driver => {
        driversList.appendChild(createDriverCard(driver));
    });
}

// ==================== فتح نافذة الإضافة ====================
function openAddModal() {
    currentEditId = null;
    modalTitle.textContent = '➕ إضافة سائق جديد';
    modalBody.innerHTML = buildDriverForm();
    modalConfirmBtn.className = 'btn-confirm';
    modalConfirmBtn.textContent = '💾 إضافة';
    modal.style.display = 'flex';
}

// ==================== فتح نافذة التعديل ====================
function openEditModal(driverId) {
    const driver = allDrivers.find(d => d.id === driverId);
    if (!driver) return;

    currentEditId = driverId;
    modalTitle.textContent = '✏️ تعديل بيانات السائق';
    modalBody.innerHTML = buildDriverForm(driver);
    modalConfirmBtn.className = 'btn-confirm';
    modalConfirmBtn.textContent = '💾 حفظ التعديلات';
    modal.style.display = 'flex';
}

// ==================== نموذج السائق ====================
function buildDriverForm(driver = null) {
    const isEdit = !!driver;
    
    return `
        <label>👤 الاسم الكامل <span class="required">*</span></label>
        <input type="text" id="driverName" placeholder="مثال: سعد السائق" 
               value="${isEdit ? driver.name : ''}" required>

        <label>🔢 رقم الموظف <span class="required">*</span></label>
        <input type="text" id="driverId" placeholder="مثال: 4001" 
               value="${isEdit ? driver.id : ''}" 
               ${isEdit ? 'disabled' : ''} required>
        ${isEdit ? '<span class="hint">⚠️ رقم الموظف لا يمكن تعديله</span>' : ''}

        <label>📞 رقم الجوال</label>
        <input type="tel" id="driverPhone" placeholder="05xxxxxxxx" 
               value="${isEdit ? (driver.phone || '') : ''}">

        <label>🪪 رقم الرخصة</label>
        <input type="text" id="driverLicense" placeholder="مثال: LIC-4001" 
               value="${isEdit ? (driver.license || '') : ''}">
    `;
}

// ==================== فتح نافذة الحذف ====================
function openDeleteModal(driverId) {
    const driver = allDrivers.find(d => d.id === driverId);
    if (!driver) return;

    currentEditId = driverId;
    modalTitle.textContent = '🗑️ حذف السائق';
    modalBody.innerHTML = `
        <p style="text-align:center; font-size:16px;">
            هل أنت متأكد من حذف السائق؟
        </p>
        <div style="background: #fee2e2; padding: 16px; border-radius: 10px; text-align:center; margin: 16px 0;">
            <div style="font-size: 18px; font-weight: 700; color: #991b1b;">${driver.name}</div>
            <div style="font-size: 14px; color: #991b1b; margin-top: 4px; font-family: monospace;">${driver.id}</div>
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
    currentEditId = null;
}

// ==================== حفظ السائق (إضافة/تعديل) ====================
modalConfirmBtn.addEventListener('click', function () {
    const modalTitleText = modalTitle.textContent;

    // ============ حذف ============
    if (modalTitleText.includes('حذف')) {
        if (!currentEditId) return;

        allDrivers = allDrivers.filter(d => d.id !== currentEditId);
        saveDrivers();
        updateStats();
        renderDrivers();
        closeModal();
        showToast('🗑️ تم حذف السائق');
        return;
    }

    // ============ إضافة / تعديل ============
    const name = document.getElementById('driverName').value.trim();
    const id = document.getElementById('driverId').value.trim();
    const phone = document.getElementById('driverPhone').value.trim();
    const license = document.getElementById('driverLicense').value.trim();

    if (!name) { alert('❌ يجب إدخال الاسم'); return; }
    if (!id) { alert('❌ يجب إدخال رقم الموظف'); return; }

    // ============ إضافة جديدة ============
    if (!currentEditId) {
        // تحقق من عدم تكرار الرقم
        if (allDrivers.find(d => d.id === id)) {
            alert('❌ رقم الموظف مسجل مسبقاً');
            return;
        }

        allDrivers.push({
            id: id,
            name: name,
            phone: phone || null,
            license: license || null,
            active: true,
            createdAt: new Date().toISOString()
        });

        saveDrivers();
        updateStats();
        renderDrivers();
        closeModal();
        showToast('✅ تم إضافة السائق بنجاح');
    }

    // ============ تعديل ============
    else {
        const driver = allDrivers.find(d => d.id === currentEditId);
        if (!driver) return;

        driver.name = name;
        driver.phone = phone || null;
        driver.license = license || null;

        saveDrivers();
        updateStats();
        renderDrivers();
        closeModal();
        showToast('✅ تم حفظ التعديلات');
    }
});

// ==================== تفعيل/تعطيل سائق ====================
function toggleDriver(driverId) {
    const driver = allDrivers.find(d => d.id === driverId);
    if (!driver) return;

    const action = driver.active ? 'تعطيل' : 'تفعيل';
    if (!confirm(`هل أنت متأكد من ${action} السائق "${driver.name}"؟`)) return;

    driver.active = !driver.active;
    saveDrivers();
    updateStats();
    renderDrivers();
    showToast(driver.active ? '✅ تم تفعيل السائق' : '🚫 تم تعطيل السائق');
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
    }, 2500);
}

// ==================== الأحداث ====================
document.addEventListener('DOMContentLoaded', function () {
    loadDrivers();
    updateStats();
    renderDrivers();

    searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderDrivers();
    });
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
