const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");

// Example protected route
router.post("/", verifyToken, async (req, res) => {

    const complaintData = req.body;
    const userId = req.user.uid;

    // Save to Firestore here

    res.json({ message: "Complaint saved" });
});

router.get("/", verifyToken, async (req, res) => {

    const userId = req.user.uid;

    // Fetch user complaints from Firestore

    res.json([]); // return array
});

module.exports = router;