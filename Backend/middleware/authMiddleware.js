const { admin } = require("../firebaseAdmin");

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1]; // Safer split method
        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = decodedToken; // attach user info (uid, email) to request
        next();

    } catch (error) {
        console.error("Token Verification Error:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = verifyToken;