const express = require("express");
const cors = require("cors");

const complaintRoutes = require("./routes/complaintRoutes");
const adminRoutes = require("./routes/adminRoutes"); // Add this

const app = express();

app.use(cors());
app.use(express.json());

// User routes
app.use("/api/complaints", complaintRoutes);

// Admin routes
app.use("/api/admin", adminRoutes); // Add this

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});