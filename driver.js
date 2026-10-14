// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== متغيرات عامة ====================
let myTrips = [];
let currentFilter = 'active';
let currentAction = null;
let currentTripNumber = null;
let currentIssueImages = []; // صور البلاغ الحالي

// ==================== مراحل الرحلة ====================
const STAGES = [
    { key: 'assigned',           label: 'مُسندة إليّ',        icon: '📋' },
    { key: 'accepted',           label: 'استلمت المهمة',      icon: '📥' },
    { key: 'en_route_pickup',    label: 'متوجه للالتقاط',     icon: '🚗' },
    { key: 'trip_started',       label: 'بدأت الرحلة',        icon: '🚀' },
    { key: 'at_destination',     label: 'وصلت للوجهة',        icon: '🎯' },
    { key: 'completed',          label: 'أكملت الطلب',        icon: '✅' }
];

// ==================== عناصر الصفحة ====================
const tripsList = document.getElementById('tripsList');
const emptyState = document.getElementById('emptyState');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// ==================== تحميل البيانات ====================
function loadTrips() {
    const allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    
    myTrips = allRequests.filter(r => 
        r.assignedDriver === currentUser.employeeId &&
        (
            r.status === 'approved' ||
            r.status === 'accepted' ||
            r.status === 'en_route_pickup' ||
            r.status === 'trip_started' ||
            r.status === 'at_destination' ||
            r.status === 'issue_reported' ||
            r.status === 'completed'
        )
    );

    myTrips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ==================== تحديث الإحصائيات ====================
function updateStats() {
    activeCount.textContent = myTrips.filter(t => t.status !== 'completed' && t.status !== 'issue_reported').length;
    completedCount.textContent = myTrips.filter(t => t.status === 'completed').length;
}

// ==================== تصفية ====================
function getFilteredTrips() {
    if (currentFilter === 'all') return myTrips;
    if (currentFilter === 'active') return myTrips.filter(t => t.status !== 'completed' && t.status !== 'issue_reported');
    if (currentFilter === 'completed') return myTrips.filter(t => t.status === 'completed');
    return myTrips;
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
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const period = h >= 12 ? 'م' : 'ص';
        const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${displayHour}:${m} ${period}`;
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

function getStatusLabel(status) {
    const labels = {
        'approved': 'جاهزة للاستلام',
        'accepted': 'تم الاستلام',
        'en_route_pickup': 'متوجه للالتقاط',
        'trip_started': 'قيد الرحلة',
        'at_destination': 'في الوجهة',
        'issue_reported': '⚠️ بلاغ عطل',
        'completed': 'مكتملة'
    };
    return labels[status] || status;
}

// ==================== Timeline ====================
function buildTimeline(trip) {
    if (trip.status === 'issue_reported') {
        const currentStageIndex = STAGES.findIndex(s => s.key === trip.issueStage);
        
        return `
            <div class="timeline">
                <div class="timeline-title">📊 مراحل الرحلة</div>
                ${STAGES.map((stage, idx) => {
                    let cls = '';
                    let time = '';
                    
                    if (idx <= currentStageIndex) {
                        cls = 'done';
                        const timeKey = stage.key + 'At';
                        time = formatTimestamp(trip[timeKey]);
                    }
                    
                    return `
                        <div class="timeline-item ${cls}">
                            <div class="timeline-icon">${cls === 'done' ? '✓' : idx + 1}</div>
                            <div class="timeline-info">
                                <div class="timeline-label">${stage.icon} ${stage.label}</div>
                                <div class="timeline-time">${time}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
                <div class="timeline-item current">
                    <div class="timeline-icon">⚠️</div>
                    <div class="timeline-info">
                        <div class="timeline-label">⚠️ تم الإبلاغ عن عطل</div>
                        <div class="timeline-time">${formatTimestamp(trip.issueReportedAt)}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    const currentStageIndex = STAGES.findIndex(s => s.key === trip.status);
    
    return `
        <div class="timeline">
            <div class="timeline-title">📊 مراحل الرحلة</div>
            ${STAGES.map((stage, idx) => {
                let cls = '';
                let time = '';
                
                if (idx < currentStageIndex) {
                    cls = 'done';
                    const timeKey = stage.key + 'At';
                    time = formatTimestamp(trip[timeKey]);
                } else if (idx === currentStageIndex) {
                    cls = 'current';
                    if (trip.status === 'completed') cls = 'done';
                    time = formatTimestamp(trip[stage.key + 'At']) || 'جاري';
                }
                
                return `
                    <div class="timeline-item ${cls}">
                        <div class="timeline-icon">${cls === 'done' ? '✓' : (cls === 'current' ? '●' : idx + 1)}</div>
                        <div class="timeline-info">
                            <div class="timeline-label">${stage.icon} ${stage.label}</div>
                            <div class="timeline-time">${time}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== ملخص الفحص ====================
function buildInspectionSummary(trip) {
    if (!trip.inspectionStart && !trip.inspectionEnd) return '';
    
    let html = '<div class="inspection-summary">';
    
    if (trip.inspectionStart) {
        const i = trip.inspectionStart;
        html += `
            <div class="inspection-title">🔍 فحص الاستلام</div>
            <div class="inspection-grid">
                <div>🛞 الإطارات: <strong>${i.tires || '-'}</strong></div>
                <div>⛽ الوقود: <strong>${i.fuel || '-'}</strong></div>
                <div>🧼 النظافة: <strong>${i.cleanliness || '-'}</strong></div>
                <div>💡 الأنوار: <strong>${i.lights || '-'}</strong></div>
            </div>
            ${i.startOdometer ? `<div class="inspection-odometer">📏 عداد البداية: <strong>${i.startOdometer} كم</strong></div>` : ''}
        `;
    }
    
    if (trip.inspectionEnd) {
        const i = trip.inspectionEnd;
        html += `
            <div class="inspection-title">🔍 فحص الإكمال</div>
            <div class="inspection-grid">
                <div>🚗 حالة المركبة: <strong>${i.vehicleCondition || '-'}</strong></div>
                <div>⛽ الوقود: <strong>${i.fuel || '-'}</strong></div>
            </div>
            ${i.endOdometer ? `<div class="inspection-odometer">📏 عداد النهاية: <strong>${i.endOdometer} كم</strong></div>` : ''}
            ${trip.distance ? `<div class="inspection-odometer">📊 المسافة: <strong>${trip.distance} كم</strong></div>` : ''}
        `;
    }
    
    html += '</div>';
    return html;
}

// ==================== تنبيه العطل ====================
function buildIssueAlert(trip) {
    if (trip.status !== 'issue_reported') return '';
    
    const issueTypes = {
        'mechanical': '🔧 عطل ميكانيكي',
        'electrical': '⚡ عطل كهربائي',
        'tire': '🛞 إطار مثقوب',
        'accident': '💥 حادث سير',
        'fuel': '⛽ نفاد وقود',
        'other': '❓ أخرى'
    };
    
    // الصور
    let imagesHTML = '';
    if (trip.issueImages && trip.issueImages.length > 0) {
        imagesHTML = `
            <div class="issue-images">
                ${trip.issueImages.map((img, idx) => `
                    <img src="${img}" class="issue-thumb" onclick="viewImage('${trip.requestNumber}', ${idx})" alt="صورة العطل">
                `).join('')}
            </div>
        `;
    }
    
    return `
        <div class="issue-alert">
            <div class="issue-alert-title">⚠️ تم الإبلاغ عن عطل</div>
            <div class="issue-alert-type">${issueTypes[trip.issueType] || trip.issueType || 'غير محدد'}</div>
            ${trip.issueNotes ? `<div class="issue-alert-notes">📝 ${trip.issueNotes}</div>` : ''}
            ${imagesHTML}
            <div class="issue-alert-time">⏰ ${formatTimestamp(trip.issueReportedAt)}</div>
            <div class="issue-alert-hint">📢 تم إبلاغ المنفذ — في انتظار الإجراء</div>
        </div>
    `;
}

// ==================== إنشاء بطاقة الرحلة ====================
function createTripCard(trip) {
    const card = document.createElement('div');
    card.className = 'trip-card ' + 
        (trip.status === 'completed' ? 'completed' : '') +
        (trip.status === 'issue_reported' ? ' issue-card' : '');

    const statusLabel = getStatusLabel(trip.status);

    let actionButtons = '';
    const showIssueButton = trip.status !== 'completed' && trip.status !== 'issue_reported';

    let mainAction = '';
    if (trip.status === 'approved') {
        mainAction = `<button class="btn-trip btn-accept" onclick="openModal('accept', '${trip.requestNumber}')">📥 استلمت المهمة</button>`;
    } else if (trip.status === 'accepted') {
        mainAction = `<button class="btn-trip btn-en-route" onclick="openModal('en_route', '${trip.requestNumber}')">🚗 توجهت للالتقاط</button>`;
    } else if (trip.status === 'en_route_pickup') {
        mainAction = `<button class="btn-trip btn-start-trip" onclick="openModal('start_trip', '${trip.requestNumber}')">🚀 بدأت الرحلة</button>`;
    } else if (trip.status === 'trip_started') {
        mainAction = `<button class="btn-trip btn-arrived" onclick="openModal('arrived', '${trip.requestNumber}')">🎯 وصلت للوجهة</button>`;
    } else if (trip.status === 'at_destination') {
        mainAction = `<button class="btn-trip btn-complete" onclick="openModal('complete', '${trip.requestNumber}')">✅ أكملت الطلب</button>`;
    }

    if (showIssueButton) {
        actionButtons = `
            <div class="trip-actions">
                ${mainAction}
                <button class="btn-trip btn-issue" onclick="openModal('issue', '${trip.requestNumber}')">
                    🚨 الإبلاغ عن عطل أو حادث
                </button>
            </div>
        `;
    } else if (trip.status === 'completed') {
        actionButtons = `<div class="completed-note">✅ تم إكمال هذه الرحلة بنجاح</div>`;
    }

    card.innerHTML = `
        <div class="trip-header">
            <div class="trip-number">${trip.requestNumber}</div>
            <div class="status-badge ${trip.status === 'completed' ? 'completed' : (trip.status === 'issue_reported' ? 'issue' : '')}">${statusLabel}</div>
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

        ${buildIssueAlert(trip)}
        ${buildInspectionSummary(trip)}
        ${buildTimeline(trip)}
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
            'active': 'لا يوجد رحلات نشطة حالياً',
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

// ==================== نماذج النوافذ ====================
function buildAcceptForm() {
    return `
        <div class="confirm-icon">📥</div>
        <div class="request-info-box">${currentTripNumber}</div>
        <p style="text-align:center; margin-bottom:18px;">أدخل بيانات استلام المركبة</p>

        <div class="form-section-mini">
            <label class="form-label-mini">📏 عداد الكيلومترات الحالي <span class="required">*</span></label>
            <input type="number" id="startOdometer" class="input-mini" placeholder="مثال: 45600" min="0" required>
        </div>

        <div class="form-section-mini">
            <label class="form-label-mini">🔍 فحص السيارة</label>
            
            <div class="inspection-field">
                <label class="field-label">🛞 الإطارات <span class="required">*</span></label>
                <select id="tiresStatus" class="input-mini" required>
                    <option value="">-- اختر الحالة --</option>
                    <option value="سليمة">✅ سليمة</option>
                    <option value="تحتاج فحص">⚠️ تحتاج فحص</option>
                    <option value="بها عطل">❌ بها عطل</option>
                </select>
            </div>

            <div class="inspection-field">
                <label class="field-label">⛽ مستوى الوقود <span class="required">*</span></label>
                <select id="fuelLevel" class="input-mini" required>
                    <option value="">-- اختر المستوى --</option>
                    <option value="ممتلئ">ممتلئ (F)</option>
                    <option value="3/4">¾</option>
                    <option value="1/2">½</option>
                    <option value="1/4">¼</option>
                    <option value="فارغ">فارغ (E)</option>
                </select>
            </div>

            <div class="inspection-field">
                <label class="field-label">🧼 النظافة <span class="required">*</span></label>
                <select id="cleanlinessStatus" class="input-mini" required>
                    <option value="">-- اختر الحالة --</option>
                    <option value="ممتازة">✅ ممتازة</option>
                    <option value="جيدة">🟡 جيدة</option>
                    <option value="تحتاج تنظيف">❌ تحتاج تنظيف</option>
                </select>
            </div>

            <div class="inspection-field">
                <label class="field-label">💡 الأنوار <span class="required">*</span></label>
                <select id="lightsStatus" class="input-mini" required>
                    <option value="">-- اختر الحالة --</option>
                    <option value="تعمل جميعها">✅ تعمل جميعها</option>
                    <option value="بعضها لا يعمل">⚠️ بعضها لا يعمل</option>
                    <option value="لا تعمل">❌ لا تعمل</option>
                </select>
            </div>

            <div class="inspection-field">
                <label class="field-label">📝 ملاحظات عن عطل سابق (اختياري)</label>
                <textarea id="previousIssue" class="input-mini" rows="2" placeholder="هل يوجد عطل أو حادث سابق؟"></textarea>
            </div>
        </div>
    `;
}

function buildCompleteForm() {
    return `
        <div class="confirm-icon">✅</div>
        <div class="request-info-box">${currentTripNumber}</div>
        <p style="text-align:center; margin-bottom:18px;">أدخل بيانات إكمال الرحلة</p>

        <div class="form-section-mini">
            <label class="form-label-mini">📏 عداد الكيلومترات عند النهاية <span class="required">*</span></label>
            <input type="number" id="endOdometer" class="input-mini" placeholder="مثال: 45650" min="0" required>
        </div>

        <div class="form-section-mini">
            <label class="field-label">🚗 حالة المركبة <span class="required">*</span></label>
            <select id="vehicleCondition" class="input-mini" required>
                <option value="">-- اختر الحالة --</option>
                <option value="سليمة">✅ سليمة</option>
                <option value="بها ملاحظات بسيطة">⚠️ بها ملاحظات بسيطة</option>
                <option value="بها عطل">❌ بها عطل</option>
            </select>
        </div>

        <div class="form-section-mini">
            <label class="field-label">⛽ مستوى الوقود <span class="required">*</span></label>
            <select id="fuelLevelEnd" class="input-mini" required>
                <option value="">-- اختر المستوى --</option>
                <option value="ممتلئ">ممتلئ (F)</option>
                <option value="3/4">¾</option>
                <option value="1/2">½</option>
                <option value="1/4">¼</option>
                <option value="فارغ">فارغ (E)</option>
            </select>
        </div>

        <div class="form-section-mini">
            <label class="field-label">📝 ملاحظات إضافية (اختياري)</label>
            <textarea id="endNotes" class="input-mini" rows="2" placeholder="أي ملاحظات عن الرحلة..."></textarea>
        </div>
    `;
}

function buildIssueForm() {
    return `
        <div class="confirm-icon" style="color:#ef4444;">🚨</div>
        <div class="request-info-box">${currentTripNumber}</div>
        <p style="text-align:center; margin-bottom:18px; color:#ef4444; font-weight:700;">
            سيتم إيقاف الرحلة وإبلاغ المنفذ فورًا
        </p>

        <div class="form-section-mini">
            <label class="form-label-mini">📝 نوع المشكلة <span class="required">*</span></label>
            <select id="issueType" class="input-mini" required>
                <option value="">-- اختر نوع المشكلة --</option>
                <option value="mechanical">🔧 عطل ميكانيكي</option>
                <option value="electrical">⚡ عطل كهربائي</option>
                <option value="tire">🛞 إطار مثقوب</option>
                <option value="accident">💥 حادث سير</option>
                <option value="fuel">⛽ نفاد وقود</option>
                <option value="other">❓ أخرى</option>
            </select>
        </div>

        <div class="form-section-mini">
            <label class="form-label-mini">📝 ملاحظات (اختياري)</label>
            <textarea id="issueNotes" class="input-mini" rows="3" placeholder="اشرح المشكلة بالتفصيل..."></textarea>
        </div>

        <div class="form-section-mini">
            <label class="form-label-mini">📷 صور العطل (اختياري — حتى 5 صور)</label>
            <div class="images-upload-area">
                <input type="file" id="issueImagesInput" accept="image/*" multiple style="display:none;">
                <button type="button" class="btn-upload-image" onclick="document.getElementById('issueImagesInput').click()">
                    📷 إضافة صور
                </button>
                <div id="imagesPreview" class="images-preview"></div>
            </div>
        </div>

        <div style="background:#fee2e2; padding:12px 14px; border-radius:10px; font-size:13px; color:#991b1b; text-align:center;">
            ⚠️ لن تستطيع إكمال الرحلة بعد الإبلاغ
        </div>
    `;
}

// ==================== معاينة الصور ====================
function renderImagesPreview() {
    const preview = document.getElementById('imagesPreview');
    if (!preview) return;

    preview.innerHTML = currentIssueImages.map((img, idx) => `
        <div class="preview-item">
            <img src="${img}" alt="صورة ${idx + 1}">
            <button type="button" class="btn-remove-image" onclick="removeIssueImage(${idx})">✕</button>
        </div>
    `).join('');
}

function removeIssueImage(idx) {
    currentIssueImages.splice(idx, 1);
    renderImagesPreview();
}

// ==================== ضغط الصور ====================
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==================== عرض صورة مكبرة ====================
function viewImage(tripNumber, imageIndex) {
    const allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    const trip = allRequests.find(t => t.requestNumber === tripNumber);
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

// ==================== فتح النافذة ====================
function openModal(action, tripNumber) {
    currentAction = action;
    currentTripNumber = tripNumber;
    currentIssueImages = [];

    const trip = myTrips.find(t => t.requestNumber === tripNumber);
    if (!trip) return;

    if (action === 'accept') {
        modalTitle.textContent = '📥 استلام المهمة';
        modalBody.innerHTML = buildAcceptForm();
        modalConfirmBtn.className = 'btn-confirm info';
        modalConfirmBtn.textContent = '📥 تأكيد الاستلام';
        modal.style.display = 'flex';
        return;
    }

    if (action === 'complete') {
        modalTitle.textContent = '✅ إكمال الطلب';
        modalBody.innerHTML = buildCompleteForm();
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.textContent = '✅ إكمال';
        modal.style.display = 'flex';
        return;
    }

    if (action === 'issue') {
        modalTitle.textContent = '🚨 الإبلاغ عن عطل / حادث';
        modalBody.innerHTML = buildIssueForm();
        modalConfirmBtn.className = 'btn-confirm';
        modalConfirmBtn.style.background = '#ef4444';
        modalConfirmBtn.textContent = '🚨 تأكيد الإبلاغ';
        modal.style.display = 'flex';

        // ربط حدث الصور
        setTimeout(() => {
            const input = document.getElementById('issueImagesInput');
            if (input) {
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        if (currentIssueImages.length >= 5) {
                            alert('⚠️ الحد الأقصى 5 صور');
                            break;
                        }
                        try {
                            const compressed = await compressImage(file);
                            currentIssueImages.push(compressed);
                        } catch (err) {
                            console.error('خطأ في ضغط الصورة:', err);
                        }
                    }
                    renderImagesPreview();
                    e.target.value = ''; // reset
                });
            }
        }, 100);
        return;
    }

    // المراحل البسيطة
    const configs = {
        'en_route': {
            title: '🚗 التوجه للالتقاط',
            icon: '🚗',
            text: 'هل أنت متجه الآن إلى مكان الالتقاط؟',
            btn: '🚗 نعم، متوجه',
            cls: 'primary'
        },
        'start_trip': {
            title: '🚀 بدء الرحلة',
            icon: '🚀',
            text: 'هل استلمت الراكب وبدأت الرحلة فعلياً؟',
            btn: '🚀 نعم، بدأت',
            cls: 'primary'
        },
        'arrived': {
            title: '🎯 الوصول للوجهة',
            icon: '🎯',
            text: 'هل وصلت إلى وجهة الرحلة؟',
            btn: '🎯 نعم، وصلت',
            cls: 'warning'
        }
    };

    const cfg = configs[action];
    if (!cfg) return;

    modalTitle.textContent = cfg.title;
    modalBody.innerHTML = `
        <div class="confirm-icon">${cfg.icon}</div>
        <div class="request-info-box">${trip.requestNumber}</div>
        <p style="text-align:center;">${cfg.text}</p>
        <p style="font-size:13px; color:#6b7280; text-align:center; margin-bottom:0;">
            📍 ${trip.pickupLocation} → 🎯 ${trip.destination}
        </p>
    `;
    modalConfirmBtn.className = 'btn-confirm ' + cfg.cls;
    modalConfirmBtn.style.background = '';
    modalConfirmBtn.textContent = cfg.btn;

    modal.style.display = 'flex';
}

// ==================== إغلاق النافذة ====================
function closeModal() {
    modal.style.display = 'none';
    currentAction = null;
    currentTripNumber = null;
    currentIssueImages = [];
    modalConfirmBtn.style.background = '';
}

// ==================== تنفيذ الإجراء ====================
modalConfirmBtn.addEventListener('click', function () {
    if (!currentTripNumber || !currentAction) return;

    const allRequests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
    const tripIndex = allRequests.findIndex(t => t.requestNumber === currentTripNumber);
    if (tripIndex === -1) return;

    const trip = allRequests[tripIndex];
    const now = new Date().toISOString();

    // ============ استلام المهمة ============
    if (currentAction === 'accept') {
        const startOdometer = document.getElementById('startOdometer').value;
        const tires = document.getElementById('tiresStatus').value;
        const fuel = document.getElementById('fuelLevel').value;
        const cleanliness = document.getElementById('cleanlinessStatus').value;
        const lights = document.getElementById('lightsStatus').value;
        const previousIssue = document.getElementById('previousIssue').value.trim();

        if (!startOdometer) { alert('❌ يجب إدخال عداد الكيلومترات'); return; }
        if (!tires) { alert('❌ يجب اختيار حالة الإطارات'); return; }
        if (!fuel) { alert('❌ يجب اختيار مستوى الوقود'); return; }
        if (!cleanliness) { alert('❌ يجب اختيار حالة النظافة'); return; }
        if (!lights) { alert('❌ يجب اختيار حالة الأنوار'); return; }

        trip.inspectionStart = {
            startOdometer: parseFloat(startOdometer),
            tires: tires,
            fuel: fuel,
            cleanliness: cleanliness,
            lights: lights,
            previousIssue: previousIssue || null,
            inspectedAt: now,
            inspectedBy: currentUser.employeeId
        };
        trip.status = 'accepted';
        trip.statusLabel = 'تم الاستلام';
        trip.acceptedAt = now;

        saveAndRefresh(allRequests);
        closeModal();
        showToast
