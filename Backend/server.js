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

// Add a ping route to wake up the server from the frontend
app.get("/api/ping", (req, res) => {
  res.status(200).send("Server is awake!");
});

// Update CORS to be more specific (Safer for Firebase hosting)
app.use(cors({
  origin: ["https://your-firebase-app-url.web.app", "http://localhost:5000", "http://127.0.0.1:5500"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));