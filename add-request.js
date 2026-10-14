// ==================== حماية الصفحة ====================
const currentUserStr = localStorage.getItem('currentUser');

if (!currentUserStr) {
    window.location.href = 'login.html';
}

const currentUser = JSON.parse(currentUserStr || '{}');

// ==================== عناصر الصفحة ====================
const requestForm = document.getElementById('requestForm');
const statusMessage = document.getElementById('statusMessage');

// ==================== تعبئة تلقائية ====================
window.addEventListener('load', function () {
    const requesterIdInput = document.getElementById('requesterId');
    if (requesterIdInput && currentUser.employeeId) {
        requesterIdInput.value = currentUser.employeeId;
    }

    const requestDate = document.getElementById('requestDate');
    if (requestDate) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        requestDate.value = `${year}-${month}-${day}`;
    }

    const requestTime = document.getElementById('requestTime');
    if (requestTime) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        requestTime.value = `${hours}:${minutes}`;
    }
});

// ==================== عرض الرسائل ====================
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message show ' + type;
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 4000);
    }
}

// ==================== معالجة الإرسال ====================
requestForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = {
        requestDate: document.getElementById('requestDate').value,
        requestTime: document.getElementById('requestTime').value,
        department: document.getElementById('department').value.trim(),
        requesterId: document.getElementById('requesterId').value.trim(),
        pickupLocation: document.getElementById('pickupLocation').value.trim(),
        destination: document.getElementById('destination').value.trim(),
        passengers: parseInt(document.getElementById('passengers').value),
        vehicleType: document.getElementById('vehicleType').value,
        proposedDriver: document.getElementById('proposedDriver').value,
        proposedVehicle: document.getElementById('proposedVehicle').value,
        contactNumber: document.getElementById('contactNumber').value.trim(),
        notes: document.getElementById('notes').value.trim(),

        requestNumber: generateRequestNumber(),
        status: 'pending_approval',
        statusLabel: 'بانتظار الاعتماد',
        createdBy: currentUser.employeeId,
        createdByName: currentUser.name,
        createdAt: new Date().toISOString()
    };

    // التحقق
    const selectedDate = new Date(formData.requestDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showStatus('❌ لا يمكن اختيار تاريخ في الماضي', 'error');
        return;
    }

    if (!formData.contactNumber) {
        showStatus('❌ الرجاء إدخال رقم التواصل', 'error');
        return;
    }

    if (formData.passengers < 1) {
        showStatus('❌ عدد الركاب يجب أن يكون 1 على الأقل', 'error');
        return;
    }

    // الحفظ
    const submitBtn = requestForm.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحفظ...';

    setTimeout(function () {
        const requests = JSON.parse(localStorage.getItem('transportRequests') || '[]');
        requests.push(formData);
        localStorage.setItem('transportRequests', JSON.stringify(requests));

        // 📜 تسجيل الحدث
        logAudit('request', 'إنشاء طلب نقل جديد', formData.requestNumber, {
            newValues: {
                status: 'بانتظار الاعتماد',
                date: formData.requestDate,
                time: formData.requestTime
            }
        });

        showStatus('✅ تم حفظ الطلب بنجاح! رقم الطلب: ' + formData.requestNumber, 'success');

        submitBtn.disabled = false;
        submitBtn.textContent = '💾 حفظ الطلب';

        setTimeout(function () {
            document.getElementById('pickupLocation').value = '';
            document.getElementById('destination').value = '';
            document.getElementById('notes').value = '';
            document.getElementById('passengers').value = '1';
            document.getElementById('contactNumber').value = '';
            document.getElementById('department').value = '';
            document.getElementById('vehicleType').value = '';
            document.getElementById('proposedDriver').value = '';
            document.getElementById('proposedVehicle').value = '';

            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                statusMessage.classList.remove('show');
            }, 2000);
        }, 2000);

    }, 800);
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

// ==================== رجوع ====================
function goBack() {
    if (confirm('هل تريد إلغاء الطلب والعودة؟')) {
        window.location.href = 'index.html';
    }
}
