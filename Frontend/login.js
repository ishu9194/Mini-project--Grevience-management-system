import { auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let isAdminLogin = false;

// Toggle Admin Mode
document.getElementById("toggleAdmin")
.addEventListener("click", () => {
    isAdminLogin = !isAdminLogin;

    document.getElementById("toggleAdmin").innerText =
        isAdminLogin ? "Login as Student" : "Login as Admin";
});

// Email Login
document.getElementById("loginForm")
.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);

        if (isAdminLogin) {
            alert("Admin login successful (Admin dashboard coming soon)");
            // future: window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }

    } catch (error) {
        alert(error.message);
    }
});

// Google Login
const provider = new GoogleAuthProvider();

document.getElementById("googleLogin")
.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);

        if (isAdminLogin) {
            alert("Admin login via Google (Admin dashboard coming soon)");
        } else {
            window.location.href = "dashboard.html";
        }

    } catch (error) {
        alert(error.message);
    }
});