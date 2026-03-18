import admin from "firebase-admin";

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // You'll need to use dynamic import or a URL for local files in ESM
    // But for Render, the Env Var is what matters.
    serviceAccount = (await import("./serviceAccountKey.json", { assert: { type: "json" } })).default;
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export const db = admin.firestore();
export { admin };