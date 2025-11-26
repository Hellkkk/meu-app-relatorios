const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginAudit = require('../models/LoginAudit');

// @route   POST /register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// @route   POST /login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Extract IP (use first IP from x-forwarded-for chain if present)
    let ip = req.ip || null;
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      ip = forwardedFor.split(',')[0].trim();
    } else if (req.connection?.remoteAddress) {
      ip = req.connection.remoteAddress;
    }
    const userAgent = req.headers['user-agent'] || null;
    const timestamp = new Date();

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists and is active
    const user = await User.findOne({ email }).populate('companies', 'name cnpj');
    if (!user || !user.isActive) {
      // Audit: User not found or inactive
      await LoginAudit.create({
        user: null,
        email,
        success: false,
        reason: 'User not found or inactive',
        ip,
        userAgent,
        timestamp
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or inactive account'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Audit: Invalid password
      await LoginAudit.create({
        user: user._id,
        email,
        success: false,
        reason: 'Invalid password',
        ip,
        userAgent,
        timestamp
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Audit: Successful login
    await LoginAudit.create({
      user: user._id,
      email,
      success: true,
      reason: null,
      ip,
      userAgent,
      timestamp
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.getPublicData()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

module.exports = router;
