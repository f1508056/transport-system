// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== حماية صلاحيات ====================
// السائق ممنوع من الوصول لهذي الصفحة
if (currentUser.role === 'driver') {
    alert('⚠️ لا تملك صلاحية الوصول لسجل المركبات');
    window.location.href = 'index.html';
}

// ==================== متغيرات عامة ====================
let allVehicles = [];
let allRequests = [];
let selectedVehicleNumber = null;
let currentFilter = 'all';

// ==================== عناصر الصفحة ====================
const vehicleSelect = document.getElementById('vehicleSelect');
const searchArea = document.getElementById('searchArea');
const initialState = document.getElementById('initialState');
const searchDate = document.getElementById('searchDate');
const searchTime = document.getElementById('searchTime');
const searchResult = document.getElementById('searchResult');
const totalTrips = document.getElementById('totalTrips');
const totalDistance = document.getElementById('totalDistance');
const driversCount = document.getElementById('driversCount');
const lastUsed = document.getElementById('lastUsed');
const tripsList = document.getElementById('tripsList');
const emptyState = document.getElementById('emptyState');

// ==================== تحميل البيانات ====================
function loadData() {
    // المركبات الحالية
    const storedVehicles = localStorage.getItem('transportVehicles');
    if (storedVehicles) {
        allVehicles = JSON.parse(storedVehicles);
    } else {
        allVehicles = [
            { number: 'V001', type: 'Sedan', make: 'تويوتا', model: 'كامري' },
            { number: 'V002', type: 'SUV', make: 'هيونداي', model: 'توسان' },
            { number: 'V003', type: 'SUV', make: 'نيسان', model: 'باترول' },
            { number: 'V004', type: 'Truck', make: 'تويوتا', model: 'هايلكس' },
            { number: 'V005', type: 'Bus', make: 'مرسيدس', model: 'سبرينتر' }
        ];
    }

    // الطلبات
    allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');

    // بناء قائمة المركبات:
    // 1. المركبات الحالية
    // 2. أي مركبة ظهرت في رحلة سابقة (حتى لو انحذفت)
    const vehicleNumbers = new Set();
    allVehicles.forEach(v => vehicleNumbers.add(v.number));
    allRequests.forEach(r => {
        if (r.assignedVehicle) vehicleNumbers.add(r.assignedVehicle);
    });

    // تحويل للمصفوفة
    const vehicleList = Array.from(vehicleNumbers).map(num => {
        const existing = allVehicles.find(v => v.number === num);
        if (existing) {
            return {
                number: existing.number,
                label: ((existing.make || '') + ' ' + (existing.model || '')).trim() || existing.number
            };
        } else {
            return {
                number: num,
                label: num + ' (محذوفة)'
            };
        }
    }).sort((a, b) => a.number.localeCompare(b.number));

    // تعبئة القائمة
    vehicleSelect.innerHTML = '<option value="">-- اختر مركبة --</option>';
    vehicleList.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.number;
        opt.textContent = v.number + ' - ' + v.label;
        vehicleSelect.appendChild(opt);
    });
}

// ==================== عند اختيار مركبة ====================
vehicleSelect.addEventListener('change', function () {
    selectedVehicleNumber = this.value;

    if (!selectedVehicleNumber) {
        searchArea.style.display = 'none';
        initialState.style.display = 'block';
        return;
    }

    searchArea.style.display = 'flex';
    initialState.style.display = 'none';
    searchResult.style.display = 'none';

    // تعيين تاريخ اليوم افتراضيًا
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    searchDate.value = `${year}-${month}-${day}`;
    searchTime.value = '08:00';

    updateStats();
    renderTrips();
});

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

function getDriverName(driverId) {
    const drivers = JSON.parse(localStorage.getItem('transportDrivers') || '[]');
    const driver = drivers.find(d => d.id === driverId);
    if (driver) return driver.name;
    const defaults = {
        '4001': 'سعد السائق',
        '4002': 'فهد السائق',
        '4003': 'ماجد السائق'
    };
    return defaults[driverId] || driverId || 'غير معروف';
}

function getStatusLabel(status) {
    const labels = {
        'completed': 'مكتملة',
        'cancelled': 'ملغاة',
        'issue_reported': 'بها عطل',
        'approved': 'معتمدة',
        'pending_approval': 'معلقة',
        'accepted': 'تم الاستلام',
        'en_route_pickup': 'متوجهة',
        'trip_started': 'قيد الرحلة',
        'at_destination': 'في الوجهة',
        'returned': 'معادة',
        'resolved_closed': 'مغلقة',
        'resolved_replacement': 'بديلة'
    };
    return labels[status] || status;
}

// ==================== جلب رحلات المركبة ====================
function getVehicleTrips(vehicleNumber) {
    return allRequests.filter(r => r.assignedVehicle === vehicleNumber)
        .sort((a, b) => {
            const dateA = new Date(a.requestDate + 'T' + (a.requestTime || '00:00'));
            const dateB = new Date(b.requestDate + 'T' + (b.requestTime || '00:00'));
            return dateB - dateA;
        });
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    if (!selectedVehicleNumber) return;

    const trips = getVehicleTrips(selectedVehicleNumber);

    totalTrips.textContent = trips.length;

    // إجمالي المسافة
    const totalKm = trips.reduce((sum, t) => sum + (t.distance || 0), 0);
    totalDistance.textContent = totalKm > 0 ? Math.round(totalKm) : 0;

    // عدد السائقين الفريدين
    const uniqueDrivers = new Set(trips.map(t => t.assignedDriver).filter(Boolean));
    driversCount.textContent = uniqueDrivers.size;

    // آخر استخدام
    if (trips.length > 0) {
        const last = trips[0];
        lastUsed.textContent = last.requestDate 
            ? formatTime(last.requestTime) 
            : '-';
    } else {
        lastUsed.textContent = '-';
    }
}

// ==================== تصفية الرحلات ====================
function getFilteredTrips() {
    const trips = getVehicleTrips(selectedVehicleNumber);
    
    if (currentFilter === 'all') return trips;
    if (currentFilter === 'completed') return trips.filter(t => t.status === 'completed');
    if (currentFilter === 'cancelled') return trips.filter(t => t.status === 'cancelled');
    if (currentFilter === 'issue') return trips.filter(t => t.status === 'issue_reported');
    
    return trips;
}

// ==================== عرض الرحلات ====================
function renderTrips() {
    if (!selectedVehicleNumber) return;

    const trips = getFilteredTrips();
    tripsList.innerHTML = '';

    if (trips.length === 0) {
        tripsList.style.display = 'none';
        emptyState.style.display = 'block';
        document.getElementById('emptyMessage').textContent = 
            currentFilter === 'all' 
                ? 'لم تُسجل أي رحلة لهذه المركبة'
                : 'لا توجد رحلات بهذه الحالة';
        return;
    }

    tripsList.style.display = 'flex';
    emptyState.style.display = 'none';

    trips.forEach(trip => {
        tripsList.appendChild(createTripCard(trip));
    });
}

// ==================== إنشاء بطاقة رحلة ====================
function createTripCard(trip) {
    const card = document.createElement('div');
    
    let cardClass = 'trip-card';
    let statusClass = 'pending';
    let statusLabel = getStatusLabel(trip.status);
    
    if (trip.status === 'completed') {
        cardClass += ' completed';
        statusClass = 'completed';
    } else if (trip.status === 'cancelled') {
        cardClass += ' cancelled';
        statusClass = 'cancelled';
    } else if (trip.status === 'issue_reported') {
        cardClass += ' issue';
        statusClass = 'issue';
    }
    
    card.className = cardClass;

    const driverName = getDriverName(trip.assignedDriver);

    card.innerHTML = `
        <div class="trip-header">
            <div class="trip-number">${trip.requestNumber}</div>
            <div class="trip-status ${statusClass}">${statusLabel}</div>
        </div>

        <div class="trip-body">
            <div class="trip-item">
                <div class="trip-item-label">📅 التاريخ</div>
                <div class="trip-item-value">${formatDate(trip.requestDate)}</div>
            </div>
            <div class="trip-item">
                <div class="trip-item-label">🕐 الوقت</div>
                <div class="trip-item-value">${formatTime(trip.requestTime)}</div>
            </div>
            <div class="trip-item full">
                <div class="trip-item-label">📍 مكان الالتقاط</div>
                <div class="trip-item-value">${trip.pickupLocation || '-'}</div>
            </div>
            <div class="trip-item full">
                <div class="trip-item-label">🎯 الوجهة</div>
                <div class="trip-item-value">${trip.destination || '-'}</div>
            </div>
            ${trip.distance ? `
                <div class="trip-item">
                    <div class="trip-item-label">📏 المسافة</div>
                    <div class="trip-item-value">${trip.distance} كم</div>
                </div>
            ` : ''}
            <div class="trip-item">
                <div class="trip-item-label">🏢 الإدارة</div>
                <div class="trip-item-value">${trip.department || '-'}</div>
            </div>
        </div>

        <div class="trip-driver">
            👤 السائق: ${driverName} (${trip.assignedDriver})
        </div>
    `;

    return card;
}

// ==================== البحث بتاريخ ووقت ====================
function searchByDateTime() {
    const date = searchDate.value;
    const time = searchTime.value;

    if (!date) {
        alert('❌ اختر التاريخ');
        return;
    }
    if (!time) {
        alert('❌ اختر الوقت');
        return;
    }

    const trips = getVehicleTrips(selectedVehicleNumber);
    
    // البحث عن رحلة في نفس التاريخ
    const sameDayTrips = trips.filter(t => t.requestDate === date);
    
    if (sameDayTrips.length === 0) {
        // ما فيه رحلة في هذا التاريخ
        showNotFoundResult('لا توجد رحلة مسجلة لهذه المركبة في هذا التاريخ');
        return;
    }

    // البحث عن الرحلة الأقرب للوقت المحدد
    const searchTimeMinutes = timeToMinutes(time);
    
    // فلتر الرحلات اللي بدأت قبل أو في نفس الوقت
    const eligibleTrips = sameDayTrips.filter(t => {
        const tripMinutes = timeToMinutes(t.requestTime || '00:00');
        return tripMinutes <= searchTimeMinutes;
    });

    let matchedTrip = null;
    if (eligibleTrips.length > 0) {
        // اختر الأقرب (الأحدث قبل الوقت)
        matchedTrip = eligibleTrips[0]; // لأنها مرتبة تنازليًا
    }

    if (!matchedTrip) {
        // ما فيه رحلة قبل هذا الوقت — نعرض أول رحلة في اليوم
        matchedTrip = sameDayTrips[sameDayTrips.length - 1]; // الأقدم
        showPartialResult(matchedTrip, time, sameDayTrips.length);
    } else {
        showFoundResult(matchedTrip, time);
    }
}

// ==================== تحويل الوقت لدقائق ====================
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

// ==================== عرض النتيجة (لقى) ====================
function showFoundResult(trip, searchTime) {
    const driverName = getDriverName(trip.assignedDriver);
    
    searchResult.className = 'search-result';
    searchResult.style.display = 'block';
    searchResult.innerHTML = `
        <div class="search-result-title">✅ النتيجة</div>
        <div class="search-result-content">
            <div>في <strong>${formatDate(trip.requestDate)}</strong> عند الساعة <strong>${searchTime}</strong>:</div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #d1d5db;">
                👤 السائق: <span class="highlight-driver">${driverName}</span> (${trip.assignedDriver})
                <div style="font-size: 13px; color: #6b7280; margin-top: 8px; font-weight: normal;">
                    📋 رقم الطلب: ${trip.requestNumber}<br>
                    🎯 المسار: ${trip.pickupLocation} → ${trip.destination}<br>
                    📊 الحالة: ${getStatusLabel(trip.status)}
                </div>
            </div>
        </div>
    `;
    searchResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== عرض النتيجة (ما لقى) ====================
function showNotFoundResult(message) {
    searchResult.className = 'search-result not-found';
    searchResult.style.display = 'block';
    searchResult.innerHTML = `
        <div class="search-result-title">⚠️ ما فيه رحلة</div>
        <div class="search-result-content">
            ${message}
        </div>
    `;
    searchResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== عرض النتيجة (جزئية) ====================
function showPartialResult(trip, searchTime, totalDayTrips) {
    const driverName = getDriverName(trip.assignedDriver);
    
    searchResult.className = 'search-result';
    searchResult.style.display = 'block';
    searchResult.innerHTML = `
        <div class="search-result-title">ℹ️ أقرب رحلة بعد ${searchTime}</div>
        <div class="search-result-content">
            <div style="font-size: 13px; color: #92400e; margin-bottom: 10px;">
                ⚠️ المركبة ما كانت مستخدمة في الوقت المحدد
                <br>يوجد <strong>${totalDayTrips}</strong> رحلة في هذا اليوم، وهذي أقربها:
            </div>
            <div style="padding-top: 12px; border-top: 1px dashed #d1d5db;">
                👤 السائق: <span class="highlight-driver">${driverName}</span> (${trip.assignedDriver})
                <div style="font-size: 13px; color: #6b7280; margin-top: 8px; font-weight: normal;">
                    📋 رقم الطلب: ${trip.requestNumber}<br>
                    🕐 وقت الرحلة: ${formatTime(trip.requestTime)}<br>
                    🎯 المسار: ${trip.pickupLocation} → ${trip.destination}
                </div>
            </div>
        </div>
    `;
    searchResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== أحداث التصفية ====================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderTrips();
    });
});

// ==================== عند التحميل ====================
document.addEventListener('DOMContentLoaded', function () {
    loadData();
});

// ==================== رجوع ====================
function goBack() {
    window.location.href = 'index.html';
}
