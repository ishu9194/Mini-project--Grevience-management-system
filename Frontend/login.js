import { auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    setPersistence,
    browserSessionPersistence // <-- NEW: Imports Session Persistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let isAdminLogin = false;

// Toggle Admin Mode
document.getElementById("toggleAdmin").addEventListener("click", () => {
    isAdminLogin = !isAdminLogin;
    document.getElementById("toggleAdmin").innerText = isAdminLogin ? "Login as Student" : "Login as Admin";
    document.querySelector(".brand-title").innerText = isAdminLogin ? "Admin Login Portal" : "GrievanceHub Login";
});

// Email Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // NEW: Force Firebase to only keep this login active in THIS specific browser tab!
        await setPersistence(auth, browserSessionPersistence);
        
        await signInWithEmailAndPassword(auth, email, password);

        if (isAdminLogin) {
            if (email !== "admin@grievancehub.com") {
                alert("Unauthorized. This portal is for administrators only.");
                await signOut(auth); 
                return;
            }
            window.location.href = "admin.html";
        } else {
            if (email === "admin@grievancehub.com") {
                alert("Admins must use the Admin Login portal.");
                await signOut(auth);
                return;
            }
            window.location.href = "dashboard.html";
        }

    } catch (error) {
        alert("Login failed: " + error.message);
    }
});

// Google Login
const provider = new GoogleAuthProvider();

document.getElementById("googleLogin").addEventListener("click", async () => {
    try {
        // NEW: Apply session persistence to Google login as well
        await setPersistence(auth, browserSessionPersistence);
        
        const result = await signInWithPopup(auth, provider);
        const email = result.user.email;

        if (isAdminLogin) {
            if (email !== "admin@grievancehub.com") {
                alert("Unauthorized. This portal is for administrators only.");
                await signOut(auth);
                return;
            }
            window.location.href = "admin.html";
        } else {
            if (email === "admin@grievancehub.com") {
                alert("Admins must use the Admin Login portal.");
                await signOut(auth);
                return;
            }
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        alert("Google login failed: " + error.message);
    }
});