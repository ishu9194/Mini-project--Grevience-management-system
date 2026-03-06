import { auth } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    updateProfile, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

// --- 1. EMAIL SIGNUP ---
document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // A. Create User in Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // B. Update Display Name in Auth
        await updateProfile(user, { displayName: name });

        // C. Create User Document in Firestore
        // This ensures the dashboard has data to load immediately
        await setDoc(doc(db, "users", user.uid), {
            fullName: name,
            email: email,
            role: "Student",
            regDate: new Date().toLocaleDateString(),
            profileImage: "" // Empty initially
        });

        alert("Account Created Successfully!");
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Signup Error:", error);
        alert(error.message);
    }
});

// --- 2. GOOGLE SIGNUP ---
const provider = new GoogleAuthProvider();

document.getElementById("googleSignup").addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user document already exists (to avoid overwriting existing data)
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New Google User -> Create Firestore Doc
            await setDoc(userRef, {
                fullName: user.displayName,
                email: user.email,
                role: "Student",
                regDate: new Date().toLocaleDateString(),
                profileImage: user.photoURL
            });
        }

        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Google Signup Error:", error);
        alert(error.message);
    }
});