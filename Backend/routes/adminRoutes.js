import express from "express";
const router = express.Router();

// 1. Corrected imports for ES Modules (Must include .js)
import { db } from "../firebaseAdmin.js";
import verifyToken from "../middleware/authMiddleware.js";

// Apply standard auth to ensure the user is logged in
router.use(verifyToken);

// Optional: Add Admin Role Verification Here
const verifyAdmin = (req, res, next) => {
    if (req.user.email !== "admin@grievancehub.com") {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
};
router.use(verifyAdmin);

// Get ALL Complaints
router.get("/complaints", async (req, res) => {
    try {
        const snapshot = await db.collection("complaints").orderBy("createdAt", "desc").get();
        const complaints = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date || (data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : 'N/A')
            };
        });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Complaint Status & Admin Note
router.put("/complaints/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;

        await db.collection("complaints").doc(id).update({
            status: status || "Not Processed yet",
            adminNote: adminNote || "",
            updatedAt: new Date()
        });

        res.json({ message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a Complaint
router.delete("/complaints/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection("complaints").doc(id).delete();
        res.json({ message: "Complaint deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Users from FIRESTORE
router.get("/users", async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            status: doc.data().status || 'Active'
        }));
        
        const studentUsers = users.filter(user => user.email !== "admin@grievancehub.com");
        
        res.json(studentUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suspend / Restore a User
router.put("/users/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.collection("users").doc(id).update({
            status: status
        });

        res.json({ message: `User status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;