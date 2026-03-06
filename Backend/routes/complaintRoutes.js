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
      userId: req.user.uid,
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
      .where("userId", "==", req.user.uid)
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

module.exports = router;
