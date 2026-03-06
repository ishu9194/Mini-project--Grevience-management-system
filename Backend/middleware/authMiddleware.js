const admin = require("firebase-admin");

// 🔐 Firebase Admin initialization
if (!admin.apps.length) {
    const serviceAccount = require("../serviceAccountKey.json"); // make sure path correct

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// ✅ Middleware function
const verifyToken = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split("Bearer ")[1];

        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = decodedToken; // attach user to request
        next();

    } catch (error) {
        console.error("Token Verification Error:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = verifyToken;