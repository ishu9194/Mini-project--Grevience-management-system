import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production (Render): Use the Environment Variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // Local Development: Read the JSON file directly 
    // This bypasses the strict Node 22 JSON import rules
    const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
    const fileContents = fs.readFileSync(serviceAccountPath, "utf-8");
    serviceAccount = JSON.parse(fileContents);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export const db = admin.firestore();
export { admin };