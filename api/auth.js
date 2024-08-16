const express = require("express");
const cors = require("cors");
const connectToDb = require("../db.js");
const authRoutes = require("../routes/auth.js");

const app = express();

connectToDb().then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Failed to connect to MongoDB", err);
});

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);

app.get("/api/auth", (req, res) => {
  res.send("Auth API is running");
});

module.exports = app;