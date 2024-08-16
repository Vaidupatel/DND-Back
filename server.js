const connectToDb = require("./db.js");
const express = require("express");
const cors = require("cors");
// const models = require('./imageHandler/models');
const app = express();
const httpPort = 5000;

// Start the server after connection established to DB
connectToDb().then(() => {
  console.log("Connected to MongoDB");
});

// Middleware
app.use(express.json());
app.use(cors());

// Import routes
// const userRoutes = require("./routes/admin.js");
// const imageRoutes = require("./routes/images.js");
// const Attendance = require("./routes/attendance.js");
const authRoutes = require("./routes/auth.js");

// Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/user", userRoutes);
// app.use("/api/auth", imageRoutes);
// app.use("/api/auth", Attendance);
app.use("/api/auth", authRoutes);

// Listen to HTTP server
app.listen(httpPort, () => {
  console.log(`HTTP Server listening on http://localhost:${httpPort}`);
});

// Endpoints
app.get("/", (req, res) => {
  try {
    res.send("NexGenWebCon Server is running successfully");
  } catch (error) {
    console.log("Error in / ", error.message);
  }
});
