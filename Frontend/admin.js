import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const API_BASE_URL = 'https://grievancehub-ty6l.onrender.com/api/admin';
let allComplaints = []; 
let currentComplaints = [];
let currentUsers = [];
let selectedComplaintId = null;

// ================= AUTHENTICATION =================
onAuthStateChanged(auth, async (user) => {
    const statusText = document.getElementById('loader-status');
    const loader = document.getElementById('app-loader');

    // 1. SECURITY CHECK: Kick out anyone who isn't the admin
    if (!user || user.email !== "admin@grievancehub.com") {
        await signOut(auth);
        window.location.href = "login.html";
        return;
    }
    
    // 2. ACTIVATE UI FIRST: Make sure tabs/buttons work immediately
    setupEventListeners(); 
    loadAdminProfilePic();
    
    // 3. LOAD DATA SAFELY
    try {
        if (statusText) statusText.innerText = "Fetching live complaints...";
        
        await loadAdminData(user);
        
        // Success! Hide the loader
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
        document.body.classList.add('auth-verified');

    } catch (e) {
        console.error("Data load issue:", e);
        if (statusText) statusText.innerHTML = "Server is taking a moment... <br> Please wait.";
    }
    
    // 4. Force UI to show the overview tab
    switchSection('overview', document.querySelector('.admin-link'));
});

// ================= ADMIN PROFILE PIC =================
function loadAdminProfilePic() {
    const savedPic = localStorage.getItem('adminProfilePic');
    if (savedPic) document.getElementById('adminProfilePic').src = savedPic;
}

document.getElementById('adminProfilePicContainer')?.addEventListener('click', () => {
    document.getElementById('adminProfileImageUpload').click();
});

document.getElementById('adminProfileImageUpload')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
        const base64 = reader.result;
        document.getElementById('adminProfilePic').src = base64;
        localStorage.setItem('adminProfilePic', base64); 
        showNotification('Admin picture updated!', 'success');
    };
    reader.readAsDataURL(file);
});

// ================= LOAD DATA (BULLETPROOF) =================
async function loadAdminData(user) {
    try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        const [complaintsRes, usersRes] = await Promise.all([
            fetch(`${API_BASE_URL}/complaints`, { headers }).catch(() => ({ ok: false })),
            fetch(`${API_BASE_URL}/users`, { headers }).catch(() => ({ ok: false }))
        ]);

        if (complaintsRes.ok) {
            allComplaints = await complaintsRes.json() || [];
        } else {
            allComplaints = [
                { id: "1", userId: "test@student.com", category: "Academics", subcategory: "Marks", nature: "Error", details: "Sample issue.", status: "Not Processed yet", date: new Date().toLocaleDateString() }
            ];
        }
        
        if (usersRes.ok) {
            currentUsers = await usersRes.json() || [];
        } else {
            currentUsers = [];
        }

    } catch (error) {
        console.warn("Running in local mode (Backend unreachable)");
    }

    currentComplaints = [...allComplaints];
    updateUI();
}

// ================= UPDATE UI =================
function updateUI() {
    updateOverviewStats();
    updateRecentComplaints();
    updateAllComplaintsTable();
    updatePendingTable();
    updateUsersTable();
    updateUserStats();
    updateCharts();
}

function updateOverviewStats() {
    document.getElementById('admin-stat-total').textContent = currentComplaints.length;
    document.getElementById('admin-stat-pending').textContent = currentComplaints.filter(c => c.status === 'Not Processed yet' || c.status === 'Not Processed').length;
    document.getElementById('admin-stat-process').textContent = currentComplaints.filter(c => c.status === 'In Process').length;
    document.getElementById('admin-stat-closed').textContent = currentComplaints.filter(c => c.status === 'Closed').length;
    document.getElementById('admin-stat-users').textContent = currentUsers.length;
}

function updateRecentComplaints() {
    const tbody = document.getElementById('recentComplaintsTable');
    if(!tbody) return;
    
    if (currentComplaints.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No complaints found.</td></tr>`;
        return;
    }

    tbody.innerHTML = currentComplaints.slice(0, 5).map(c => {
        const anonId = `Anon-${(c.id || '00000').substring(0,5).toUpperCase()}`;
        return `
        <tr>
            <td><input type="checkbox" class="complaint-checkbox" value="${c.id}"></td>
            <td class="fw-bold text-muted">${anonId}</td>
            <td>${c.category}</td>
            <td><span class="status-badge-admin ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
            <td>${c.date}</td>
        </tr>
    `}).join('');
}

function updateAllComplaintsTable() {
    const tbody = document.getElementById('adminComplaintsTable');
    if(!tbody) return;
    
    if (currentComplaints.length === 0) {
        // Now accurately matching the 8 headers in the HTML
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No complaints found.</td></tr>`;
        return;
    }

    tbody.innerHTML = currentComplaints.map(c => {
        const anonId = `Anon-${(c.id || '00000').substring(0,5).toUpperCase()}`;
        // Outputting exactly 8 data columns, perfectly aligned
        return `
        <tr>
            <td class="fw-bold text-muted">${anonId}</td>
            <td>${c.category}</td>
            <td>${c.subcategory}</td>
            <td>${c.nature || '-'}</td>
            <td>${c.details ? c.details.substring(0, 20) : ''}...</td>
            <td><span class="status-badge-admin ${getStatusBadgeClass(c.status)}">${c.status === 'Not Processed yet' ? 'Not Processed' : c.status}</span></td>
            <td>${c.date}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="window.openStatusModal('${c.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteComplaint('${c.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `}).join('');
}

function updatePendingTable() {
    const tbody = document.getElementById('pendingTable');
    if(!tbody) return;
    const pending = currentComplaints.filter(c => c.status === 'Not Processed yet' || c.status === 'Not Processed');
    
    if (pending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Hooray! No pending complaints.</td></tr>`;
        return;
    }

    tbody.innerHTML = pending.map(c => {
        const anonId = `Anon-${(c.id || '00000').substring(0,5).toUpperCase()}`;
        return `
        <tr>
            <td class="fw-bold text-muted">${anonId}</td>
            <td>${c.category}: ${c.details ? c.details.substring(0, 40) : ''}...</td>
            <td>${c.date}</td>
            <td><button class="btn btn-sm btn-warning" onclick="window.openStatusModal('${c.id}')">Take Action</button></td>
        </tr>
    `}).join('');
}

function updateUsersTable() {
    const tbody = document.getElementById('usersTable');
    if(!tbody) return;
    
    if (currentUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No registered users found.</td></tr>`;
        return;
    }

    tbody.innerHTML = currentUsers.map(user => {
        const isSuspended = user.status === 'Suspended';
        return `
        <tr>
            <td class="fw-bold">${user.fullName || 'No Name'}</td>
            <td>${user.email}</td>
            <td>${user.college || user.university || 'Not Updated'}</td>
            <td><span class="badge ${isSuspended ? 'bg-danger' : 'bg-success'}">${user.status || 'Active'}</span></td>
            <td><button class="btn btn-sm ${isSuspended ? 'btn-outline-success' : 'btn-outline-danger'}" onclick="window.toggleUserStatus('${user.id}')">${isSuspended ? 'Restore' : 'Suspend'}</button></td>
        </tr>
        `;
    }).join('');
}

function updateUserStats() {
    document.getElementById('totalStudents').textContent = currentUsers.length;
    document.getElementById('activeUsers').textContent = currentUsers.filter(u => u.status !== 'Suspended').length;
}

// ================= TAB NAVIGATION =================
function switchSection(sectionId, clickedElement) {
    const allSections = ['overview', 'all-complaints', 'pending', 'users', 'analytics'];
    
    // 1. Hide all sections
    allSections.forEach(id => {
        const sec = document.getElementById(`${id}-section`);
        if (sec) {
            sec.style.display = 'none';
            sec.classList.add('section-hidden');
        }
    });

    // 2. Show the target section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.remove('section-hidden');
    }

    // 3. Update active link styling
    document.querySelectorAll('.admin-link').forEach(l => l.classList.remove('active-nav'));
    if(clickedElement) clickedElement.classList.add('active-nav');
    
    // 4. Load charts if analytics is clicked
    if(sectionId === 'analytics') {
        setTimeout(updateCharts, 100); 
    }

    // 5. MOBILE FIX: Auto-close the sidebar after clicking a link
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        if (sidebar) {
            sidebar.classList.remove('active');
            // Ensure it slides back out of view
            sidebar.style.transform = 'translateX(-100%)'; 
        }
        if (mainContent) {
            mainContent.classList.remove('expanded');
        }
    }
}

// CRITICAL FIX: Attach this to the window object so your HTML can trigger it!
window.showSection = switchSection;

// ================= ACTIONS =================
window.openStatusModal = function(complaintId) {
    selectedComplaintId = complaintId;
    const complaint = allComplaints.find(c => c.id === complaintId);
    
    if(complaint) {
        const anonId = `Anonymous (ID: ${(complaint.id || '00000').substring(0,5).toUpperCase()})`;
        
        document.getElementById('adminModalUser').innerText = anonId; 
        document.getElementById('adminModalCategory').innerText = `${complaint.category} > ${complaint.subcategory}`;
        document.getElementById('adminModalNature').innerText = complaint.nature || 'Not specified';
        document.getElementById('adminModalDate').innerText = complaint.date || 'Unknown';
        document.getElementById('adminModalDescription').innerText = complaint.details || 'No description.';

        let currentStatus = complaint.status === 'Not Processed' ? 'Not Processed yet' : complaint.status;
        document.getElementById('newStatus').value = currentStatus;
        document.getElementById('adminNote').value = complaint.adminNote || ''; 

        new bootstrap.Modal(document.getElementById('statusModal')).show();
    }
}

document.getElementById('updateStatusBtn')?.addEventListener('click', async function() {
    if (!selectedComplaintId) return;
    let newStatus = document.getElementById('newStatus').value;
    let adminNote = document.getElementById('adminNote').value;

    const cIndex = allComplaints.findIndex(c => c.id === selectedComplaintId);
    if(cIndex > -1) {
        allComplaints[cIndex].status = newStatus;
        allComplaints[cIndex].adminNote = adminNote;
    }
    
    filterComplaints(); 
    bootstrap.Modal.getInstance(document.getElementById('statusModal')).hide();
    showNotification('Status updated!', 'success');

    try {
        const token = await auth.currentUser.getIdToken();
        fetch(`${API_BASE_URL}/complaints/${selectedComplaintId}/status`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, adminNote: adminNote })
        });
    } catch(e) {}
});

window.deleteComplaint = async function(complaintId) {
    if (confirm('Delete this complaint permanently?')) {
        allComplaints = allComplaints.filter(c => c.id !== complaintId);
        filterComplaints();
        showNotification('Complaint deleted!', 'danger');

        try {
            const token = await auth.currentUser.getIdToken();
            fetch(`${API_BASE_URL}/complaints/${complaintId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        } catch(e) {}
    }
}

window.toggleUserStatus = async function(userId) {
    const userIndex = currentUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const user = currentUsers[userIndex];
    const isSuspended = user.status === 'Suspended';

    if(confirm(isSuspended ? 'Restore this user?' : 'Suspend this user?')) {
        user.status = isSuspended ? 'Active' : 'Suspended';
        updateUsersTable();
        updateUserStats();
        showNotification(isSuspended ? 'User restored!' : 'User suspended!', isSuspended ? 'success' : 'danger');

        try {
            const token = await auth.currentUser.getIdToken();
            fetch(`${API_BASE_URL}/users/${userId}/status`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: user.status })
            });
        } catch(e) {}
    }
}

// ================= EVENT LISTENERS & FILTERS =================
// --- 1. EVENT LISTENERS SETUP ---
function setupEventListeners() {
    
    // A. Select All Checkbox
    const selectAllBox = document.getElementById('selectAllRecent');
    if (selectAllBox) {
        selectAllBox.addEventListener('change', function() {
            // Find all checkboxes in the table and match them to the Select All box
            const checkboxes = document.querySelectorAll('.complaint-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }

    // B. Quick Actions
    document.getElementById('btnBulkClose')?.addEventListener('click', () => {
        handleBulkAction('Closed', 'Bulk closed successfully!', 'success');
    });
    
    document.getElementById('btnAssignTeam')?.addEventListener('click', () => {
        handleBulkAction('In Process', 'Assigned to team!', 'info');
    });

    // C. Logout Button
    document.querySelector('.logout-btn')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout from the Admin Panel?')) {
            try {
                await signOut(auth); // Make sure signOut is imported at the top!
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Logout failed", error);
                alert("Failed to log out. Please check your connection.");
            }
        }
    });
}

// --- 2. BULK ACTION LOGIC ---
async function handleBulkAction(newStatus, msg, alertType) {
    // 1. Grab all the currently checked boxes
    const checkedBoxes = document.querySelectorAll('.complaint-checkbox:checked');
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedIds.length === 0) {
        alert("Please select at least one complaint by checking the box next to it.");
        return;
    }

    if (confirm(`Are you sure you want to change ${selectedIds.length} complaints to "${newStatus}"?`)) {
        try {
            const token = await auth.currentUser.getIdToken();
            
            // 2. Send the update to Render for EVERY selected complaint
            const updatePromises = selectedIds.map(id => {
                return fetch(`${API_BASE_URL}/complaints/${id}/status`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ status: newStatus, adminNote: '' })
                });
            });

            // Wait for all updates to finish
            await Promise.all(updatePromises);

            // 3. Uncheck the 'Select All' box so it's ready for next time
            const selectAllBox = document.getElementById('selectAllRecent');
            if (selectAllBox) selectAllBox.checked = false;

            // 4. Show success popup and reload the live data!
            showNotification(msg, alertType);
            await loadAdminData(auth.currentUser); 

        } catch (error) {
            console.error("Bulk action failed:", error);
            alert("Failed to update complaints. Make sure your server is online.");
        }
    }
}

function filterComplaints() {
    const statusFilter = document.getElementById('statusFilter').value;
    currentComplaints = allComplaints.filter(c => {
        if (statusFilter === 'All Status') return true;
        const mappedStatus = statusFilter === 'Not Processed' ? 'Not Processed yet' : statusFilter;
        return c.status === mappedStatus;
    });
    updateUI();
}

function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getStatusBadgeClass(status) {
    return (status === 'Not Processed yet' || status === 'Not Processed') ? 'status-pending-admin' : 
           status === 'In Process' ? 'status-process-admin' : 'status-closed-admin';
}

// ================= CHARTS (PREMIUM UPGRADE) =================
let categoryChart, statusChart, monthChart, departmentChart;

function updateCharts() {
    const catCtx = document.getElementById('categoryChart');
    const statCtx = document.getElementById('statusChart');
    const monthCtx = document.getElementById('monthChart');
    const deptCtx = document.getElementById('departmentChart');
    
    if(!catCtx || !statCtx || !monthCtx || !deptCtx) return;

    if(currentComplaints.length === 0) {
        const emptyData = { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#f3f4f6'] }] };
        const emptyOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

        if (categoryChart) categoryChart.destroy();
        categoryChart = new Chart(catCtx.getContext('2d'), { type: 'doughnut', data: emptyData, options: emptyOpts });
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(statCtx.getContext('2d'), { type: 'pie', data: emptyData, options: emptyOpts });
        if (monthChart) monthChart.destroy();
        monthChart = new Chart(monthCtx.getContext('2d'), { type: 'line', data: emptyData, options: emptyOpts });
        if (departmentChart) departmentChart.destroy();
        departmentChart = new Chart(deptCtx.getContext('2d'), { type: 'bar', data: emptyData, options: emptyOpts });
        return;
    }

    const categoryCounts = {};
    const statusCounts = { 'Not Processed yet': 0, 'In Process': 0, 'Closed': 0 };
    const monthCounts = {}; // Will store counts by numeric index (e.g. {1: 5, 2: 10} for Feb/Mar)
    const deptCounts = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    currentComplaints.forEach(c => {
        categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
        
        let stat = c.status === 'Not Processed' ? 'Not Processed yet' : c.status;
        if(statusCounts[stat] !== undefined) statusCounts[stat]++;

        // --- BULLETPROOF DATE PARSER ---
        if(c.date && c.date !== 'N/A') {
            let monthIndex = null;
            let d = new Date(c.date);
            
            if (!isNaN(d)) {
                monthIndex = d.getMonth();
            } else {
                // If browser Date parsing fails, extract month manually!
                if (c.date.includes('/')) {
                    // Usually DD/MM/YYYY
                    monthIndex = parseInt(c.date.split('/')[1]) - 1; 
                } else if (c.date.includes('-')) {
                    // Usually YYYY-MM-DD
                    monthIndex = parseInt(c.date.split('-')[1]) - 1;
                }
            }
            
            // Only tally if we successfully extracted a valid month (0-11)
            if (monthIndex !== null && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
                monthCounts[monthIndex] = (monthCounts[monthIndex] || 0) + 1;
            }
        }

        let dept = c.subcategory || 'General';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    // --- FORCE CHRONOLOGICAL ORDER FOR LINE CHART ---
    // Sorts indices mathematically (e.g., 1 (Feb) comes before 2 (Mar))
    const sortedMonthIndices = Object.keys(monthCounts).map(Number).sort((a, b) => a - b);
    const finalMonthLabels = sortedMonthIndices.map(index => monthNames[index]);
    const finalMonthData = sortedMonthIndices.map(index => monthCounts[index]);

    const totalCount = currentComplaints.length;
    const closedCount = statusCounts['Closed'];
    const resRate = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
    
    let topIssue = "-";
    let maxCount = 0;
    for (const [issue, count] of Object.entries(deptCounts)) {
        if (count > maxCount) { maxCount = count; topIssue = issue; }
    }

    document.getElementById('analytics-res-rate').innerText = `${resRate}%`;
    document.getElementById('analytics-top-dept').innerText = topIssue;

    const pieOpts = { 
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
        cutout: '70%' 
    };

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(catCtx.getContext('2d'), { 
        type: 'doughnut', 
        data: { labels: Object.keys(categoryCounts), datasets: [{ data: Object.values(categoryCounts), backgroundColor: ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'], borderWidth: 0 }] }, 
        options: pieOpts 
    });

    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statCtx.getContext('2d'), { 
        type: 'doughnut', 
        data: { labels: ['Pending', 'In Process', 'Closed'], datasets: [{ data: [statusCounts['Not Processed yet'], statusCounts['In Process'], statusCounts['Closed']], backgroundColor: ['#EF4444', '#F59E0B', '#10B981'], borderWidth: 0 }] }, 
        options: pieOpts 
    });

    // Feed perfectly sorted chronological data into the Line chart!
    if (monthChart) monthChart.destroy();
    monthChart = new Chart(monthCtx.getContext('2d'), { 
        type: 'line', 
        data: { 
            labels: finalMonthLabels, 
            datasets: [{ 
                label: 'Complaints', 
                data: finalMonthData, 
                borderColor: '#3B82F6', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderWidth: 3, 
                tension: 0.4, 
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3B82F6',
                pointBorderWidth: 2,
                pointRadius: 4
            }] 
        }, 
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
        } 
    });

    const sortedIssues = Object.entries(deptCounts).sort((a,b) => b[1] - a[1]).slice(0,5);
    
    if (departmentChart) departmentChart.destroy();
    departmentChart = new Chart(deptCtx.getContext('2d'), { 
        type: 'bar', 
        data: { 
            labels: sortedIssues.map(i => i[0].length > 15 ? i[0].substring(0,15)+'...' : i[0]), 
            datasets: [{ label: 'Cases', data: sortedIssues.map(i => i[1]), backgroundColor: '#8B5CF6', borderRadius: 4 }] 
        }, 
        options: { 
            indexAxis: 'y', 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, grid: { display: false }, ticks: { stepSize: 1 } }, y: { grid: { display: false } } }
        } 
    });
}

const UI_SOUNDS = {
    click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
    error: new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3')
};

// Global click sound for all buttons
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.admin-link')) {
        UI_SOUNDS.click.currentTime = 0; // Reset to start
        UI_SOUNDS.click.volume = 0.2;
        UI_SOUNDS.click.play();
    }
});

// --- GLOBAL UI FUNCTIONS ---
// This must be outside of everything else so the HTML can "see" it!
window.showSection = function(sectionId, clickedElement) {
    const allSections = ['overview', 'all-complaints', 'pending', 'users', 'analytics'];
    
    // Hide all
    allSections.forEach(id => {
        const sec = document.getElementById(`${id}-section`);
        if (sec) {
            sec.style.display = 'none';
            sec.classList.add('section-hidden');
        }
    });

    // Show target
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.remove('section-hidden');
    }

    // Update active state
    document.querySelectorAll('.admin-link').forEach(l => l.classList.remove('active-nav'));
    if(clickedElement) clickedElement.classList.add('active-nav');
    
    // Auto-close mobile sidebar
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.transform = 'translateX(-100%)'; 
    }
};

// --- MOBILE SIDEBAR TOGGLE (The 3 Lines) ---
document.getElementById('sidebarToggle')?.addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        // Toggle the slide effect manually
        if (sidebar.style.transform === 'translateX(0px)') {
            sidebar.style.transform = 'translateX(-100%)';
        } else {
            sidebar.style.transform = 'translateX(0px)';
        }
    }
});