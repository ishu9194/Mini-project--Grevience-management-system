import { auth } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const API_BASE ="https://grievancehub-ty6l.onrender.com/api";

let currentUserData = null;
let studentComplaints = []; // To store complaints for the modal
let viewingComplaintId = null; // To track which complaint is open

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
    const loader = document.getElementById('app-loader'); // or 'loading-overlay'
    const statusText = document.getElementById('loader-status');
    
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        if (statusText) statusText.innerText = "Waking up server...";
        
        // Ping Render to wake it up
        await fetch('https://grievancehub-ty6l.onrender.com/api/ping').catch(() => {});
        
        // Load the actual STUDENT data
        await loadUserProfile(user);
        await loadComplaints(user);
        
        // Hide the loader when done
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        if (statusText) statusText.innerHTML = "Connection failed. Please refresh.";
    }
});

/* ================= LOAD PROFILE ================= */
async function loadUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        currentUserData = snap.data();
    } else {
        // Default schema for new users
        currentUserData = {
            fullName: user.displayName || "User",
            email: user.email,
            prn: "",
            university: "",
            college: "",
            department: "",
            year: "2nd Year",
            contact: "",
            state: "",
            country: "",
            pincode: "",
            regDate: new Date().toLocaleDateString(),
            profileImage: ""
        };
        await setDoc(userRef, currentUserData);
    }
    renderUser(currentUserData);
}

function renderUser(data) {
    const fullName = data.fullName || "User";
    const email = data.email || "";
    const image = data.profileImage || "";

    // Sidebar Displays
    document.getElementById("userNameDisplay").innerText = fullName;
    document.getElementById("profileTitle").innerText = `${fullName}'s Profile`;

    // Populate all form fields safely
    if (document.getElementById("fullNameInput")) {
        document.getElementById("fullNameInput").value = fullName;
        document.getElementById("emailInput").value = email;
        document.getElementById("prnInput").value = data.prn || "";
        document.getElementById("universityInput").value = data.university || "";
        document.getElementById("collegeInput").value = data.college || "";
        document.getElementById("departmentInput").value = data.department || "";
        document.getElementById("yearInput").value = data.year || "";
        document.getElementById("contactInput").value = data.contact || "";
        document.getElementById("stateInput").value = data.state || "";
        document.getElementById("countryInput").value = data.country || "";
        document.getElementById("pincodeInput").value = data.pincode || "";
        document.getElementById("regDateInput").value = data.regDate || "";
    }

    // Profile Pic Logic
    const profilePic = document.getElementById("profilePic");
    if (image && image.startsWith("data:image")) {
        profilePic.src = image;
    } else {
        profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=120&background=FF6B35&color=fff`;
    }

    profilePic.onerror = function () {
        this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=120&background=FF6B35&color=fff`;
    };

    // ================= SUSPENSION CHECK =================
    // If the admin has suspended this user in the database, lock the form!
    if (data.status === "Suspended") {
        const submitBtn = document.querySelector(".submit-btn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.replace("btn-primary", "btn-danger");
            submitBtn.innerHTML = `<i class="fas fa-ban me-2"></i>Account Suspended`;
        }

        // Add a warning banner to the top of the form
        const formCard = document.querySelector(".complaint-form-card");
        if (formCard && !document.getElementById("suspendWarning")) {
            const warning = document.createElement("div");
            warning.id = "suspendWarning";
            warning.className = "alert alert-danger m-4 fw-bold shadow-sm";
            warning.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>Your account has been suspended by the administration. You can no lodge new complaints at this time.`;
            formCard.insertBefore(warning, formCard.children[1]);
        }
    }
    
}

/* ================= DATA & UI INITIALIZATION ================= */
const categoriesData = {
    Academic: ["Exam Issue", "Attendance", "Marks", "Results"],
    Hostel: ["Room Issue", "Water Problem", "Electricity", "Mess Food"],
    Administration: ["ID Card", "Bonafide", "Scholarship"]
};

// We wrap the setup in a function to ensure it runs right as the module loads
function initializeUI() {
    /* ================= UI & DROPDOWNS ================= */
// Updated Categories with "Other" options
const categoriesData = {
    "Admission": ["Entrance Exam Issue", "Counseling", "Fee Payment", "Document Verification", "Other"],
    "Academics": ["Classes/Timetable", "Faculty Issue", "Course Material", "Other"],
    "Finance/Accounts": ["Fee Receipt", "Refund", "Scholarship", "Other"],
    "Hostels/Infra": ["Room Issue", "Cleanliness", "Food Quality", "Other"],
    "Examinations": ["Admit Card", "Result Issue", "Re-evaluation", "Other"],
    "Other": ["Other"] // Forces custom input for both
};

// 1. POPULATE DROPDOWNS & HANDLE "OTHER" INPUTS
const categorySelect = document.getElementById("category");
const subcategorySelect = document.getElementById("subcategory");
const customCategoryInput = document.getElementById("customCategory");
const customSubcategoryInput = document.getElementById("customSubcategory");

if (categorySelect && subcategorySelect) {
    // Populate Initial Categories
    Object.keys(categoriesData).forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    // Handle Category Selection
    categorySelect.addEventListener("change", function () {
        // Show/Hide Custom Category Textbox
        if (this.value === "Other") {
            customCategoryInput.style.display = "block";
            customCategoryInput.required = true;
        } else {
            customCategoryInput.style.display = "none";
            customCategoryInput.required = false;
            customCategoryInput.value = "";
        }

        // Reset Subcategory dropdown and Custom Subcategory Textbox
        subcategorySelect.innerHTML = `<option value="">Select Subcategory</option>`;
        customSubcategoryInput.style.display = "none";
        customSubcategoryInput.required = false;
        customSubcategoryInput.value = "";

        // Populate related Subcategories
        const selectedSubs = categoriesData[this.value];
        if (selectedSubs) {
            selectedSubs.forEach(sub => {
                const option = document.createElement("option");
                option.value = sub;
                option.textContent = sub;
                subcategorySelect.appendChild(option);
            });
        }
    });

    // Handle Subcategory Selection
    subcategorySelect.addEventListener("change", function () {
        // Show/Hide Custom Subcategory Textbox
        if (this.value === "Other") {
            customSubcategoryInput.style.display = "block";
            customSubcategoryInput.required = true;
        } else {
            customSubcategoryInput.style.display = "none";
            customSubcategoryInput.required = false;
            customSubcategoryInput.value = "";
        }
    });
}

    // 1.5 SUBMIT COMPLAINT LOGIC
    const complaintForm = document.getElementById("complaintForm");
    if (complaintForm) {
        complaintForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Stop the page from refreshing!

            const user = auth.currentUser;
            if (!user) {
                alert("Please log in to submit a complaint.");
                return;
            }

            // Figure out if they picked a standard category or typed a custom one
            let finalCategory = categorySelect.value;
            if (finalCategory === "Other") {
                finalCategory = customCategoryInput.value;
            }

            let finalSubcategory = subcategorySelect.value;
            if (finalSubcategory === "Other") {
                finalSubcategory = customSubcategoryInput.value;
            }

            // Gather all the data
            const complaintData = {
                category: finalCategory,
                subcategory: finalSubcategory,
                type: document.getElementById("type").value,
                nature: document.getElementById("nature").value,
                details: document.getElementById("details").value,
                status: "Not Processed yet", 
                date: new Date().toLocaleDateString()
            };

            try {
                const token = await user.getIdToken(); // Secure Firebase token
                
                // Send it to your Express backend
                const response = await fetch(`${API_BASE}/complaints`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(complaintData)
                });

                if (response.ok) {
                    alert("Complaint submitted successfully!");
                    complaintForm.reset(); // Clear the form
                    customCategoryInput.style.display = "none";
                    customSubcategoryInput.style.display = "none";
                    
                    // Instantly reload history and stats!
                    loadComplaints(user); 
                } else {
                    const err = await response.json();
                    alert("Failed to submit: " + (err.error || "Unknown error"));
                }
            } catch (error) {
                console.error("Submit Error:", error);
                alert("Could not connect to the server. Is your Node.js backend running?");
            }
        });
    }

    // 2. UPDATE PROFILE LOGIC
    const updateBtn = document.getElementById("updateProfileBtn");
    if (updateBtn) {
        updateBtn.addEventListener("click", async () => {
            const user = auth.currentUser;
            if (!user) return;

            const updatedData = {
                fullName: document.getElementById("fullNameInput").value,
                prn: document.getElementById("prnInput").value,
                university: document.getElementById("universityInput").value,
                college: document.getElementById("collegeInput").value,
                department: document.getElementById("departmentInput").value,
                contact: document.getElementById("contactInput").value,
                state: document.getElementById("stateInput").value,
                country: document.getElementById("countryInput").value,
                pincode: document.getElementById("pincodeInput").value,
            };

            await updateDoc(doc(db, "users", user.uid), updatedData);

            currentUserData = { ...currentUserData, ...updatedData };
            renderUser(currentUserData);
            alert("Profile Updated Successfully!");
        });
    }

    // 3. LOGOUT LOGIC
    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "login.html";
        });
    }

    // 4. IMAGE UPLOAD UI
    const profilePicBtn = document.getElementById("profilePic");
    const profileImageUpload = document.getElementById("profileImageUpload");
    
    if (profilePicBtn && profileImageUpload) {
        profilePicBtn.addEventListener("click", () => {
            profileImageUpload.click();
        });
        profileImageUpload.addEventListener("change", handleImageUpload);
    }
}

// Run the initialization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUI);
} else {
    initializeUI();
}

/* ================= IMAGE UPLOAD HANDLING ================= */
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function () {
        const base64 = reader.result;
        const user = auth.currentUser;

        await updateDoc(doc(db, "users", user.uid), {
            profileImage: base64
        });

        currentUserData.profileImage = base64;
        renderUser(currentUserData);
    };
    reader.readAsDataURL(file);
}

/* ================= LOAD COMPLAINTS ================= */
async function loadComplaints(user) {
    const token = await user.getIdToken();
    try {
        const res = await fetch(`${API_BASE}/complaints`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if(res.ok) {
            studentComplaints = await res.json(); // Store locally
            updateHistoryTable(studentComplaints);
            updateStats(studentComplaints);
        }
    } catch (e) {
        console.error("Error fetching complaints:", e);
    }
}

/* ================= TABLE ================= */
function updateHistoryTable(complaints) {
    const tbody = document.getElementById("historyTableBody");
    if (!tbody) return;

    if (!complaints || !complaints.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No complaints registered yet</td></tr>`;
        return;
    }

    tbody.innerHTML = complaints.map(c => {
        let badgeClass = "status-pending";
        if (c.status === "In Process") badgeClass = "status-process";
        if (c.status === "Closed") badgeClass = "status-closed";

        return `
        <tr>
            <td>${c.category}</td>
            <td>${c.subcategory}</td>
            <td>${c.nature}</td>
            <td><span class="status-badge ${badgeClass}">${c.status}</span></td>
            <td>${c.date}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="window.viewComplaint('${c.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>`;
    }).join("");
}

/* ================= STATS ================= */
function updateStats(complaints) {
    if (!complaints) return;
    document.getElementById("stat-pending").textContent = complaints.filter(c => c.status === "Not Processed yet").length;
    document.getElementById("stat-process").textContent = complaints.filter(c => c.status === "In Process").length;
    document.getElementById("stat-closed").textContent = complaints.filter(c => c.status === "Closed").length;
}

/* ================= SECTION SWITCH ================= */
window.showSection = function(section) {
    document.getElementById("dashboard-section").classList.add("section-hidden");
    document.getElementById("account-section").classList.add("section-hidden");
    document.getElementById("history-section").classList.add("section-hidden");

    document.getElementById(section + "-section").classList.remove("section-hidden");

    document.querySelectorAll(".sidebar-link").forEach(link => link.classList.remove("active-nav"));
    // Add active class to the clicked link (optional visual improvement)
    event.currentTarget.classList.add("active-nav");
};

/* ================= VIEW & DELETE COMPLAINT LOGIC ================= */
window.viewComplaint = function(id) {
    const complaint = studentComplaints.find(c => c.id === id);
    if (!complaint) return;

    viewingComplaintId = id;

    // Populate Modal Data
    document.getElementById("modalCategoryText").innerText = `${complaint.category} > ${complaint.subcategory}`;
    document.getElementById("modalNatureText").innerText = complaint.nature || "N/A";
    document.getElementById("modalDetailsText").innerText = complaint.details;

    // Handle Admin Note Visibility
    const noteContainer = document.getElementById("modalAdminNoteContainer");
    if (complaint.adminNote && complaint.adminNote.trim() !== "") {
        noteContainer.style.display = "block";
        document.getElementById("modalAdminNoteText").innerText = complaint.adminNote;
    } else {
        noteContainer.style.display = "none";
    }

    // Handle Delete Button Visibility
    const deleteBtn = document.getElementById("deleteComplaintBtn");
    if (complaint.status === "Not Processed yet" || complaint.status === "Not Processed") {
        deleteBtn.style.display = "block"; // Show if not processed
    } else {
        deleteBtn.style.display = "none"; // Hide if admin has started working on it
    }

    // Show the modal
    new bootstrap.Modal(document.getElementById('viewComplaintModal')).show();
};

// Handle the Delete Button Click
document.getElementById("deleteComplaintBtn")?.addEventListener("click", async () => {
    if (!viewingComplaintId) return;

    if (confirm("Are you sure you want to withdraw this complaint? This cannot be undone.")) {
        try {
            const user = auth.currentUser;
            const token = await user.getIdToken();
            
            const response = await fetch(`${API_BASE}/complaints/${viewingComplaintId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                alert("Complaint successfully withdrawn.");
                bootstrap.Modal.getInstance(document.getElementById('viewComplaintModal')).hide();
                loadComplaints(user); // Reload the table automatically!
            } else {
                const err = await response.json();
                alert(err.error || "Failed to delete complaint.");
            }
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Could not connect to the server.");
        }
    }
});

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