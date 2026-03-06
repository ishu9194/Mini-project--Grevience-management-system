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
const API_BASE = "http://localhost:5000/api";

let currentUserData = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    await loadUserProfile(user);
    await loadComplaints(user);
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
            const complaints = await res.json();
            updateHistoryTable(complaints);
            updateStats(complaints);
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
            <td>-</td>
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