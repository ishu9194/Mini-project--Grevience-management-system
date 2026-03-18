import express from "express";
const router = express.Router();

// 1. Corrected imports (Must include .js extension)
import { db } from "../firebaseAdmin.js";
import verifyToken from "../middleware/authMiddleware.js";

// Create complaint
router.post("/", verifyToken, async (req, res) => {
  try {
    const complaint = req.body;

    // Use the db instance imported from firebaseAdmin.js
    await db.collection("complaints").add({
      ...complaint,
      status: "Not Processed yet", // Server-side default for security
      userId: req.user.email,      // Tracked via verified token
      uid: req.user.uid,           // Securely link to their account
      createdAt: new Date(),
    });

    res.json({ message: "Complaint saved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logged in user's complaints
router.get("/", verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection("complaints")
      .where("uid", "==", req.user.uid) // Secure filter by Firebase UID
      .get();

    const complaints = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a complaint (Only if Not Processed)
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const complaintRef = db.collection("complaints").doc(id);
        const doc = await complaintRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Complaint not found" });
        }

        const data = doc.data();

        // Security: Ensure owner identity
        if (data.uid !== req.user.uid) {
            return res.status(403).json({ error: "Unauthorized to delete this complaint" });
        }

        // Logic: Only allow withdrawal if admin hasn't started yet
        if (data.status !== "Not Processed yet" && data.status !== "Not Processed") {
            return res.status(400).json({ error: "You cannot delete a complaint that is already being processed." });
        }

        await complaintRef.delete();
        res.json({ message: "Complaint deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Export default for ES Modules
export default router;