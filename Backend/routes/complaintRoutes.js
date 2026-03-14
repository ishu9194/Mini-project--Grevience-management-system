const express = require("express");
const router = express.Router();
const { db } = require("../firebaseAdmin");
const verifyToken = require("../middleware/authMiddleware");

// Create complaint
router.post("/", verifyToken, async (req, res) => {
  try {
    const complaint = req.body;

    await db.collection("complaints").add({
      ...complaint,
      userId: req.user.email, // Save their email for the admin table!
      uid: req.user.uid,      // Save UID for their personal dashboard
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
      .where("uid", "==", req.user.uid) // Filter by UID securely
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

        // 1. Security: Make sure this user owns the complaint
        if (data.uid !== req.user.uid) {
            return res.status(403).json({ error: "Unauthorized to delete this complaint" });
        }

        // 2. Logic: Make sure it hasn't been processed
        if (data.status !== "Not Processed yet" && data.status !== "Not Processed") {
            return res.status(400).json({ error: "You cannot delete a complaint that is already being processed." });
        }

        await complaintRef.delete();
        res.json({ message: "Complaint deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;