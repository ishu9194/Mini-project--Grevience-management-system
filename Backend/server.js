const express = require("express");
const cors = require("cors");

const complaintRoutes = require("./routes/complaintRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/complaints", complaintRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
