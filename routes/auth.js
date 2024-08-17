const { Router } = require("express");
const router = Router();
const User = require("../models/User.js");
const { body, validationResult } = require("express-validator");
const { genSalt, hash, compare } = require("bcrypt");
const { sign, verify } = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const useragent = require("express-useragent");
require("dotenv").config();

const jWT_SECRET = process.env.REACT_APP_JWT_SECRET;

const generateCommonStyles = () => `
  body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
  }
  .header {
    background-color: #1877f2;
    color: #ffffff;
    text-align: center;
    padding: 20px;
    font-size: 24px;
    font-weight: bold;
  }
  .content {
    background-color: #ffffff;
    padding: 30px;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  .footer {
    text-align: center;
    margin-top: 20px;
    font-size: 12px;
    color: #888;
  }
`;

// Function to generate OTP HTML
const generateOtpHtml = (otp) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NexGen WebCon OTP</title>
    <style>
      ${generateCommonStyles()}
      .otp {
        font-size: 36px;
        font-weight: bold;
        text-align: center;
        color: #1877f2;
        margin: 20px 0;
        letter-spacing: 5px;
      }
      .timer {
        text-align: center;
        font-size: 18px;
        color: #e74c3c;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        Welcome to NexGen WebCon!
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>Thank you for choosing NexGen WebCon. To complete your sign-up process, please use the following One-Time Password (OTP):</p>
        <div class="otp">${otp}</div>
        <div class="timer">⏳ This OTP is valid for 1 minute only</div>
        <p>Please enter this code on the sign-up page to verify your account and join the future of web conferences!</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </div>
      <div class="footer">
        &copy; 2024 NexGen WebCon. All rights reserved.
      </div>
    </div>
  </body>
  </html>
`;

// Function to generate Password Reset Confirmation HTML
const generatePasswordResetConfirmationHtml = (name) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Confirmation</title>
    <style>
      ${generateCommonStyles()}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        NexGen WebCon - Password Reset Confirmation
      </div>
      <div class="content">
        <p>Hello ${name},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you did not initiate this password reset, please contact our support team immediately.</p>
      </div>
      <div class="footer">
        &copy; 2024 NexGen WebCon. All rights reserved.
      </div>
    </div>
  </body>
  </html>
`;

// Function to generate Login Notification HTML
const generateLoginNotificationHtml = (name, deviceInfo) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Login Detected</title>
    <style>
      ${generateCommonStyles()}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        NexGen WebCon - New Login Detected
      </div>
      <div class="content">
        <p>Hello ${name},</p>
        <p>We detected a new login to your NexGen WebCon account.</p>
        <p><strong>Device Details:</strong></p>
        <ul>
          <li>Device: ${deviceInfo.device}</li>
          <li>Browser: ${deviceInfo.browser}</li>
          <li>Operating System: ${deviceInfo.os}</li>
        </ul>
        <p>If this was you, you can disregard this email. If you didn't log in recently, please change your password immediately and contact our support team.</p>
      </div>
      <div class="footer">
        &copy; 2024 NexGen WebCon. All rights reserved.
      </div>
    </div>
  </body>
  </html>
`;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.REACT_APP_SENDER_MAIL,
    pass: process.env.REACT_APP_SENDER_PASS,
  },
});

// Store OTPs temporarily (in production, use a database or caching system)
const otpStore = new Map();

router.post(
  "/send-otp",
  [
    body("name", "Enter valid name").isLength({ min: 3 }),
    body("email", "Enter valid email").isEmail(),
    body("mobile", "Enter valid mobile number").isMobilePhone(),
    body("password", "Enter valid password").isLength({ min: 5 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { email, mobile } = req.body;
      let userEmail = await User.findOne({ email: email });
      let userMobile = await User.findOne({ mobile: mobile });
      if (userEmail) {
        return res.status(400).json({
          success: false,
          error: "Sorry, user with this email already exists",
        });
      } else if (userMobile) {
        return res.status(400).json({
          success: false,
          error: "Sorry, user with this mobile already exists",
        });
      }
      const otp = crypto.randomInt(100000, 999999).toString();
      const expirationTime = Date.now() + 60000;
      otpStore.set(email, { otp, expirationTime });
      await transporter.sendMail({
        from: `"NexGen WebCon" <${process.env.REACT_APP_SENDER_MAIL}>`,
        to: email,
        subject: "🔐 Your Exclusive Access Code for NexGen WebCon",
        text: `Welcome to NexGen WebCon! Your OTP for sign up is: ${otp}. This OTP is valid for 1 minute. Enter it quickly to join the future of web conferences!`,
        html: generateOtpHtml(otp),
      });
      res.json({
        success: true,
        message: "OTP sent successfully",
        expirationTime,
      });
    } catch (error) {
      res.status(500).send("Internal server error");
    }
  }
);

router.post(
  "/verify-otp",
  [
    body("email", "Enter valid email").isEmail(),
    body("otp", "Enter valid OTP").isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { email, otp, name, mobile, password } = req.body;
      const storedOTP = otpStore.get(email);
      if (!storedOTP || storedOTP.otp !== otp) {
        return res.status(400).json({ success: false, error: "Invalid OTP" });
      }
      if (Date.now() > storedOTP.expirationTime) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, error: "OTP expired" });
      }
      const salt = await genSalt(10);
      let secPassword = await hash(password, salt);
      const user = await User.create({
        name,
        email,
        mobile,
        password: secPassword,
      });
      const data = {
        user: {
          email: user.email,
        },
      };
      otpStore.delete(email);
      const authToken = sign(data, jWT_SECRET);
      res.cookie("authToken", authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      res.json({ success: true, message: "User created successfully" });
    } catch (error) {
      res.status(500).send("Internal server error");
    }
  }
);

router.post(
  "/login",
  [
    body("email", "Enter valid email").isEmail(),
    body("password", "Enter valid password").isLength({ min: 5 }),
  ],
  useragent.express(),
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email: email });
      if (!user) {
        return res.status(400).json({
          success,
          error:
            "No record found! Please try to login with correct credentials!",
        });
      }
      const passwordCompare = await compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({
          success,
          error: "Please try to login with correct credentials!",
        });
      }
      const data = {
        user: {
          id: user.id,
        },
      };
      success = true;
      const authToken = sign(data, jWT_SECRET);
      res.cookie("authToken", authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      const deviceInfo = {
        device: req.useragent.isMobile
          ? "Mobile"
          : req.useragent.isTablet
          ? "Tablet"
          : "Desktop",
        browser: req.useragent.browser,
        os: req.useragent.os,
      };
      await transporter.sendMail({
        from: `"NexGen WebCon" <${process.env.REACT_APP_SENDER_MAIL}>`,
        to: email,
        subject: "New Login Detected on Your NexGen WebCon Account",
        html: generateLoginNotificationHtml(user.name, deviceInfo),
      });
      res.json({
        success,
        user: {
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        },
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
    }
  }
);

router.post(
  "/forgot-password",
  [body("email", "Enter valid email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: "User with this email does not exist",
        });
      }
      const otp = crypto.randomInt(100000, 999999).toString();
      const expirationTime = Date.now() + 300000;
      otpStore.set(email, { otp, expirationTime, purpose: "reset_password" });
      await transporter.sendMail({
        from: `"NexGen WebCon" <${process.env.REACT_APP_SENDER_MAIL}>`,
        to: email,
        subject: "🔐 Password Reset OTP for NexGen WebCon",
        text: `Your OTP for password reset is: ${otp}. This OTP is valid for 5 minutes. Enter it quickly to reset your password!`,
        html: generateOtpHtml(otp),
      });
      res.json({
        success: true,
        message: "Password reset OTP sent successfully",
        expirationTime,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error");
    }
  }
);

router.post(
  "/reset-password",
  [
    body("email", "Enter valid email").isEmail(),
    body("otp", "Enter valid OTP").isLength({ min: 6, max: 6 }),
    body("newPassword", "Enter valid password").isLength({ min: 5 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { email, otp, newPassword } = req.body;
      const storedOTP = otpStore.get(email);
      if (
        !storedOTP ||
        storedOTP.otp !== otp ||
        storedOTP.purpose !== "reset_password"
      ) {
        return res.status(400).json({ success: false, error: "Invalid OTP" });
      }
      if (Date.now() > storedOTP.expirationTime) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, error: "OTP expired" });
      }
      const salt = await genSalt(10);
      const secPassword = await hash(newPassword, salt);
      const user = await User.findOneAndUpdate(
        { email },
        { password: secPassword }
      );
      otpStore.delete(email);
      await transporter.sendMail({
        from: `"NexGen WebCon" <${process.env.REACT_APP_SENDER_MAIL}>`,
        to: email,
        subject: "Your NexGen WebCon Password Has Been Reset",
        html: generatePasswordResetConfirmationHtml(user.name),
      });
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error");
    }
  }
);

router.get("/check-auth", async (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.json({ isLoggedIn: false });
  }
  try {
    const decoded = verify(token, jWT_SECRET);
    const user = await User.findOne({ _id: decoded.user.id });
    if (user) {
      res.json({
        isLoggedIn: true,
        user: { name: user.name, email: user.email, mobile: user.mobile },
      });
    } else {
      res.json({ isLoggedIn: false });
    }
  } catch (error) {
    res.json({ isLoggedIn: false });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("authToken");
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
