// ==========================================
// EduManage Application Configuration & State
// ==========================================
const API_BASE_URL = 'http://localhost:8081/api';

let state = {
    activeTab: 'students',
    students: [],
    classes: [],
    subjects: [],
    results: [],
    filteredStudents: null // For search/rewards
};

// ==========================================
// Initialization & Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    showToast('Đang kết nối đến máy chủ...', 'info');
    await loadAllData();
    renderAll();
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.menu-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Primary action button (e.g. Add Student)
    document.getElementById('btn-add-primary').addEventListener('click', () => {
        handlePrimaryAddAction();
    });

    // Student filters
    document.getElementById('btn-filter-rewards').addEventListener('click', handleFilterRewards);
    document.getElementById('btn-clear-filter').addEventListener('click', handleClearFilter);
    document.getElementById('student-search-input').addEventListener('input', handleStudentSearch);

    // Form submissions
    document.getElementById('student-form').addEventListener('submit', handleStudentSubmit);
    document.getElementById('class-form').addEventListener('submit', handleClassSubmit);
    document.getElementById('subject-form').addEventListener('submit', handleSubjectSubmit);
    document.getElementById('result-form').addEventListener('submit', handleResultSubmit);
}

// ==========================================
// Data Fetching & Sync Services
// ==========================================
async function loadAllData() {
    try {
        const [studentsData, classesData, subjectsData, resultsData] = await Promise.all([
            fetchAPI('/students'),
            fetchAPI('/classes'),
            fetchAPI('/subjects'),
            fetchAPI('/results')
        ]);

        state.students = studentsData || [];
        state.classes = classesData || [];
        state.subjects = subjectsData || [];
        state.results = resultsData || [];
        
        updateStats();
        populateClassDropdown();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu từ server:', error);
        showToast('Kết nối API thất bại! Vui lòng khởi động Backend Spring Boot.', 'error');
    }
}

async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Lỗi HTTP ${response.status}`);
        }
        // Check if response is empty or standard string text
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return text; // Return raw text if not JSON
        }
    } catch (error) {
        throw error;
    }
}

// ==========================================
// State & UI Renders
// ==========================================
function renderAll() {
    renderStudentsTable();
    renderClassesTable();
    renderSubjectsTable();
    renderResultsTable();
}

function updateStats() {
    document.getElementById('stat-total-students').innerText = state.students.length;
    document.getElementById('stat-total-classes').innerText = state.classes.length;
    document.getElementById('stat-total-subjects').innerText = state.subjects.length;
}

function populateClassDropdown() {
    const dropdown = document.getElementById('sv-malop');
    dropdown.innerHTML = '';
    
    if (state.classes.length === 0) {
        dropdown.innerHTML = '<option value="">(Không có lớp học nào)</option>';
        return;
    }
    
    state.classes.forEach(c => {
        const option = document.createElement('option');
        option.value = c.maLop;
        option.textContent = `${c.maLop} - ${c.tenLop}`;
        dropdown.appendChild(option);
    });
}

// Switch UI tabs
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Toggle active menu button
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Toggle active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    // Update Header titles
    const titleEl = document.getElementById('page-title');
    const descEl = document.getElementById('page-subtitle');
    const primaryBtn = document.getElementById('btn-add-primary');

    primaryBtn.style.display = 'inline-flex';
    
    switch (tabId) {
        case 'students':
            titleEl.textContent = 'Quản Lý Sinh Viên';
            descEl.textContent = 'Xem thông tin chi tiết và cập nhật hồ sơ sinh viên';
            primaryBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm Sinh Viên';
            break;
        case 'classes':
            titleEl.textContent = 'Quản Lý Lớp Học';
            descEl.textContent = 'Quản lý danh sách lớp học và điều chỉnh sĩ số';
            primaryBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm Lớp Học';
            break;
        case 'subjects':
            titleEl.textContent = 'Quản Lý Môn Học';
            descEl.textContent = 'Quản lý học trình môn học giảng dạy và số tín chỉ';
            primaryBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm Môn Học';
            break;
        case 'results':
            titleEl.textContent = 'Quản Lý Kết Quả';
            descEl.textContent = 'Cập nhật điểm thi và kết quả học tập của sinh viên';
            primaryBtn.style.display = 'none'; // Results usually created automatically
            break;
    }
}

// Formats millisecond or raw timestamp to readable local string
function formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    // If it's a numeric timestamp (like java.sql.Date milliseconds)
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Convert date to HTML5 date input format (YYYY-MM-DD)
function toHTML5Date(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==========================================
// Tab 1 Render: Student Table
// ==========================================
function renderStudentsTable() {
    const tbody = document.getElementById('student-table-body');
    tbody.innerHTML = '';

    const list = state.filteredStudents !== null ? state.filteredStudents : state.students;

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fa-solid fa-face-frown"></i>
                    <p>Không tìm thấy sinh viên nào!</p>
                </td>
            </tr>`;
        return;
    }

    list.forEach(sv => {
        const tr = document.createElement('tr');
        
        // Map rating levels to badge classes
        let ratingClass = 'tb';
        if (sv.xepLoai === 'Giỏi' || sv.xepLoai === 'Xuất sắc') ratingClass = 'gioi';
        else if (sv.xepLoai === 'Khá') ratingClass = 'kha';
        else if (sv.xepLoai === 'Yếu' || sv.xepLoai === 'Kém') ratingClass = 'yeu';

        tr.innerHTML = `
            <td style="font-weight: 600; color: #a5b4fc;">${sv.maSV}</td>
            <td style="font-weight: 500;">${sv.hoTen}</td>
            <td>${formatDate(sv.ngSinh)}</td>
            <td>${sv.gioiTinh}</td>
            <td>${sv.queQuan}</td>
            <td><span class="badge" style="background: rgba(99, 102, 241, 0.1); color: #818cf8;">${sv.fk_MaLop || sv.fk_MaLop === null ? (sv.fk_MaLop || 'N/A') : sv.malop}</span></td>
            <td style="font-weight: 700; color: #38bdf8;">${sv.diemTB !== null ? parseFloat(sv.diemTB).toFixed(2) : '0.00'}</td>
            <td><span class="badge ${ratingClass}">${sv.xepLoai || 'Chưa xếp loại'}</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon edit" onclick="window.openEditStudent('${sv.maSV}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon delete" onclick="window.deleteStudent('${sv.maSV}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// Tab 2 Render: Classes Table
// ==========================================
function renderClassesTable() {
    const tbody = document.getElementById('class-table-body');
    tbody.innerHTML = '';

    if (state.classes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fa-solid fa-face-frown"></i>
                    <p>Không tìm thấy lớp học nào!</p>
                </td>
            </tr>`;
        return;
    }

    state.classes.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #a5b4fc;">${c.maLop}</td>
            <td style="font-weight: 500;">${c.tenLop}</td>
            <td style="font-weight: 600; color: #34d399;">${c.siSo}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon edit" onclick="window.openEditClass('${c.maLop}', ${c.siSo})">
                        <i class="fa-solid fa-users-gear"></i>
                    </button>
                    <button class="btn-icon delete" onclick="window.deleteClass('${c.maLop}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// Tab 3 Render: Subjects Table
// ==========================================
function renderSubjectsTable() {
    const tbody = document.getElementById('subject-table-body');
    tbody.innerHTML = '';

    if (state.subjects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fa-solid fa-face-frown"></i>
                    <p>Không tìm thấy môn học nào!</p>
                </td>
            </tr>`;
        return;
    }

    state.subjects.forEach(mh => {
        const tr = document.createElement('tr');
        const badgeType = mh.batBuoc ? 'required' : 'optional';
        const badgeText = mh.batBuoc ? 'Bắt buộc' : 'Tự chọn';

        tr.innerHTML = `
            <td style="font-weight: 600; color: #a5b4fc;">${mh.maMH}</td>
            <td style="font-weight: 500;">${mh.tenMH}</td>
            <td style="font-weight: 600; color: #38bdf8;">${mh.soTC}</td>
            <td><span class="badge ${badgeType}">${badgeText}</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon edit" onclick="window.openEditSubject('${mh.maMH}', ${mh.soTC})">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon delete" onclick="window.deleteSubject('${mh.maMH}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// Tab 4 Render: Results Table
// ==========================================
function renderResultsTable() {
    const tbody = document.getElementById('result-table-body');
    tbody.innerHTML = '';

    if (state.results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fa-solid fa-face-frown"></i>
                    <p>Không tìm thấy điểm thi nào!</p>
                </td>
            </tr>`;
        return;
    }

    state.results.forEach(kq => {
        const tr = document.createElement('tr');
        
        let scoreColor = '#6b7280';
        let formattedScore = 'Chưa nhập';
        if (kq.diemThi !== null) {
            const val = parseFloat(kq.diemThi);
            formattedScore = val.toFixed(2);
            if (val >= 8.0) scoreColor = '#34d399';
            else if (val >= 5.0) scoreColor = '#38bdf8';
            else scoreColor = '#f87171';
        }

        tr.innerHTML = `
            <td style="font-weight: 600; color: #a5b4fc;">${kq.fk_MaSV}</td>
            <td style="font-weight: 500;">${kq.fk_MaMH}</td>
            <td>Học Kỳ ${kq.hocKy}</td>
            <td style="font-weight: 800; color: ${scoreColor};">${formattedScore}</td>
            <td>
                <button class="btn-icon edit" onclick="window.openEditResult('${kq.fk_MaSV}', ${kq.diemThi || 0})">
                    <i class="fa-solid fa-marker"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// Actions and Handlers (CRUD Trigger)
// ==========================================
function handlePrimaryAddAction() {
    if (state.activeTab === 'students') {
        document.getElementById('student-modal-title').textContent = 'Thêm Mới Sinh Viên';
        document.getElementById('student-form-mode').value = 'add';
        document.getElementById('student-form').reset();
        document.getElementById('sv-masv').disabled = false;
        openModal('student-modal');
    } else if (state.activeTab === 'classes') {
        document.getElementById('class-modal-title').textContent = 'Thêm Mới Lớp Học';
        document.getElementById('class-form-mode').value = 'add';
        document.getElementById('class-form').reset();
        document.getElementById('c-malop').disabled = false;
        openModal('class-modal');
    } else if (state.activeTab === 'subjects') {
        document.getElementById('subject-modal-title').textContent = 'Thêm Mới Môn Học';
        document.getElementById('subject-form-mode').value = 'add';
        document.getElementById('subject-form').reset();
        document.getElementById('sub-mamh').disabled = false;
        openModal('subject-modal');
    }
}

// --- STUDENT ACTION HANDLERS ---

async function handleStudentSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('student-form-mode').value;
    const masv = document.getElementById('sv-masv').value.trim();
    
    const payload = {
        maSV: masv,
        hoTen: document.getElementById('sv-hoten').value.trim(),
        ngSinh: document.getElementById('sv-ngsinh').value,
        gioiTinh: document.getElementById('sv-gioitinh').value,
        queQuan: document.getElementById('sv-quequan').value.trim(),
        fk_MaLop: document.getElementById('sv-malop').value,
        diemTB: parseFloat(document.getElementById('sv-diemtb').value),
        xepLoai: document.getElementById('sv-xeploai').value
    };

    try {
        if (mode === 'add') {
            await fetchAPI('/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showToast('Thêm sinh viên thành công!', 'success');
        } else {
            // Edit mode
            await fetchAPI(`/students/${masv}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showToast('Cập nhật thông tin sinh viên thành công!', 'success');
        }
        closeModal('student-modal');
        await loadAllData();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Lỗi thao tác sinh viên', 'error');
    }
}

window.openEditStudent = function(masv) {
    const sv = state.students.find(s => s.maSV === masv);
    if (!sv) return;

    document.getElementById('student-modal-title').textContent = 'Cập Nhật Sinh Viên';
    document.getElementById('student-form-mode').value = 'edit';
    
    document.getElementById('sv-masv').value = sv.maSV;
    document.getElementById('sv-masv').disabled = true; // Key cannot be edited
    
    document.getElementById('sv-hoten').value = sv.hoTen;
    document.getElementById('sv-ngsinh').value = toHTML5Date(sv.ngSinh);
    document.getElementById('sv-gioitinh').value = sv.gioiTinh;
    document.getElementById('sv-quequan').value = sv.queQuan;
    document.getElementById('sv-malop').value = sv.fk_MaLop || '';
    document.getElementById('sv-diemtb').value = sv.diemTB || '';
    document.getElementById('sv-xeploai').value = sv.xepLoai || 'Giỏi';

    openModal('student-modal');
}

window.deleteStudent = async function(masv) {
    if (!confirm(`Bạn có chắc chắn muốn xóa sinh viên ${masv}?`)) return;
    try {
        await fetchAPI(`/students/${masv}`, { method: 'DELETE' });
        showToast('Đã xóa sinh viên thành công!', 'success');
        await loadAllData();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Lỗi khi xóa sinh viên', 'error');
    }
}

// Student Search Filtering
function handleStudentSearch(e) {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
        state.filteredStudents = null;
    } else {
        state.filteredStudents = state.students.filter(sv => 
            sv.maSV.toLowerCase().includes(q) || 
            sv.hoTen.toLowerCase().includes(q) ||
            (sv.queQuan && sv.queQuan.toLowerCase().includes(q))
        );
    }
    renderStudentsTable();
}

// Student Rewards Filtering
async function handleFilterRewards() {
    try {
        showToast('Đang tải danh sách học bổng...', 'info');
        const list = await fetchAPI('/students/rewards?score=8.0');
        state.filteredStudents = list || [];
        renderStudentsTable();
        
        document.getElementById('btn-clear-filter').style.display = 'inline-flex';
        showToast(`Tìm thấy ${state.filteredStudents.length} sinh viên đạt học bổng!`, 'success');
    } catch (error) {
        showToast('Lỗi khi lọc học bổng', 'error');
    }
}

function handleClearFilter() {
    state.filteredStudents = null;
    renderStudentsTable();
    document.getElementById('btn-clear-filter').style.display = 'none';
    document.getElementById('student-search-input').value = '';
}

// --- CLASS ACTION HANDLERS ---

async function handleClassSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('class-form-mode').value;
    const malop = document.getElementById('c-malop').value.trim();
    const siso = parseInt(document.getElementById('c-siso').value);

    try {
        if (mode === 'add') {
            const tenlop = document.getElementById('c-tenlop').value.trim();
            await fetchAPI('/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maLop: malop, tenLop: tenlop, siSo: siso })
            });
            showToast('Tạo lớp học mới thành công!', 'success');
        } else {
            // Edit class size only
            await fetchAPI(`/classes/${malop}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siSo: siso })
            });
            showToast('Điều chỉnh sĩ số lớp thành công!', 'success');
        }
        closeModal('class-modal');
        await loadAllData();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Lỗi thao tác lớp học', 'error');
    }
}

window.openEditClass = function(malop, siso) {
    document.getElementById('class-modal-title').textContent = 'Điều Chỉnh Sĩ Số Lớp';
    document.getElementById('class-form-mode').value = 'edit';
    
    document.getElementById('c-malop').value = malop;
    document.getElementById('c-malop').disabled = true;
    
    // Hide name field for editing since API only supports modifying class size (siSo)
    const nameEl = document.getElementById('c-tenlop').closest('.form-group');
    nameEl.style.display = 'none';
    
    document.getElementById('c-siso').value = siso;
    
    openModal('class-modal');
    
    // Restore layout state when closing
    const handleClose = () => {
        nameEl.style.display = 'flex';
        document.getElementById('class-modal').removeEventListener('click', checkClose);
    };
    
    const checkClose = (e) => {
        if (e.target.id === 'class-modal' || e.target.classList.contains('btn-close') || e.target.textContent === 'Hủy') {
            handleClose();
        }
    };
    document.getElementById('class-modal').addEventListener('click', checkClose);
}

window.deleteClass = async function(malop) {
    if (!confirm(`Bạn có chắc muốn xóa lớp ${malop}?`)) return;
    try {
        await fetchAPI(`/classes/${malop}`, { method: 'DELETE' });
        showToast('Đã xóa lớp học thành công!', 'success');
        await loadAllData();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Lỗi khi xóa lớp học', 'error');
    }
}

// --- SUBJECT ACTION HANDLERS ---

async function handleSubjectSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('subject-form-mode').value;
    const mamh = document.getElementById('sub-mamh').value.trim();
    const sotc = parseInt(document.getElementById('sub-sotc').value);

    try {
        if (mode === 'add') {
            const tenmh = document.getElementById('sub-tenmh').value.trim();
            const batbuoc = document.getElementById('sub-batbuoc').checked;
            await fetchAPI('/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maMH: mamh, tenMH: tenmh, soTC: sotc, batBuoc: batbuoc })
            });
            showToast('Thêm môn học mới thành công!', 'success');
        } else {
            // Edit credits only
            await fetchAPI(`/subjects/${mamh}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ soTC: sotc })
            });
            showToast('Cập nhật số tín chỉ thành công!', 'success');
        }
        closeModal('subject-modal');
        await loadAllData();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Lỗi thao tác môn học', 'error');
    }
}

window.openEditSubject = function(mamh, sotc) {
    document.getElementById('subject-modal-title').textContent = 'Sửa Số Tín Chỉ';
    document.getElementById('subject-form-mode').value = 'edit';
    
    document.getElementById('sub-mamh').value = mamh;
    document.getElementById('sub-mamh').disabled = true;
    
    const nameEl = document.getElementById('sub-tenmh').closest('.form-group');
    const checkedEl = document.getElementById('sub-batbuoc').closest('.form-group');
    
    nameEl.style.display = 'none';
    checkedEl.style.display = 'none';
    
    document.getElementById('sub-sotc').value = sotc;
    
    openModal('subject-modal');
    
    const handleClose = () => {
        nameEl.style.display = 'flex';
        checkedEl.style.display = 'flex';
    };
    
    document.getElementById('subject-modal').addEventListener('click', (e) => {
        if (e.target.id === 'subject-modal' || e.target.classList.contains('btn-close') || e.target.textContent === 'Hủy') {
            handleClose();
        }
    }, { once: true });
}

window.deleteSubject = async function(mamh) {
    if (!confirm(`Bạn có chắc muốn xóa môn học ${mamh}?`)) return;
    try {
        await fetchAPI(`/subjects/${mamh}`, { method: 'DELETE' });
        showToast('Đã xóa môn học thành công!', 'success');
        await loadAllData();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Lỗi khi xóa môn học', 'error');
    }
}

// --- RESULT ACTION HANDLERS ---

async function handleResultSubmit(e) {
    e.preventDefault();
    const masv = document.getElementById('res-masv').value;
    const diemthi = parseFloat(document.getElementById('res-diemthi').value);

    try {
        await fetchAPI(`/results/${masv}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diemThi: diemthi })
        });
        showToast('Cập nhật điểm số thành công!', 'success');
        closeModal('result-modal');
        await loadAllData();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Lỗi khi cập nhật điểm', 'error');
    }
}

window.openEditResult = function(masv, currentScore) {
    document.getElementById('res-masv').value = masv;
    document.getElementById('res-display-masv').value = masv;
    document.getElementById('res-diemthi').value = currentScore;
    
    openModal('result-modal');
}

// ==========================================
// Modal Window Helpers
// ==========================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// ==========================================
// Toast Alerts Controller
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';
    else if (type === 'info') iconClass = 'fa-solid fa-circle-info';

    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}
