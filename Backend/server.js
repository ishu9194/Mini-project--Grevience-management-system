import express from "express";
import cors from "cors";

// Note: In ESM, you MUST include the .js extension for local files
import complaintRoutes from "./routes/complaintRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// 1. Setup CORS properly BEFORE routes
app.use(cors({
    origin: [
        "https://student-grievance-e3c67.web.app", 
        "https://student-grievance-e3c67.firebaseapp.com",
        "http://localhost:5000", 
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());

// 2. Ping route for Render Keep-Alive
app.get("/api/ping", (req, res) => {
    res.status(200).send("Server is awake!");
});

// 3. Routes
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminRoutes);

// 4. Use Render's dynamic PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});