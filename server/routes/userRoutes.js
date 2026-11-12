const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');


// User management routes
router.get('/', protect, async (req, res, next) => {
  try {
    const query = {};
    if (req.query.role) {
      query.role = req.query.role.toUpperCase();
    }
    const users = await User.find(query).select('name email role isActive');
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
