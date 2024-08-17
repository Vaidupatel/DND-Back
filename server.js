const connectToDb = require("./db.js");
const express = require("express");
const cors = require("cors");
const app = express();
const httpPort = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");

const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? "https://nexgenwebcon.netlify.app"
      : "http://localhost:3000",
  credentials: true,
};

connectToDb().then(() => {
  console.log("Connected to MongoDB");
});

app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

const authRoutes = require("./routes/auth.js");

// Routes
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
