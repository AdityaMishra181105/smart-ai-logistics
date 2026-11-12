const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Helper to sign JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallbacksecret', {
    expiresIn: '30d',
  });
};

const formatUserResponse = (user) => {
  let regDate = user.createdAt;
  if (!regDate && user._id && typeof user._id.getTimestamp === 'function') {
    regDate = user._id.getTimestamp();
  }
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    organization: user.organization || '',
    profileImage: user.profileImage || '',
    isActive: user.isActive !== undefined ? user.isActive : true,
    isEmailVerified: user.isEmailVerified !== undefined ? user.isEmailVerified : true,
    lastLogin: user.lastLogin || user.updatedAt || regDate,
    createdAt: regDate
  };
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 60 characters long',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user already exists with this email address',
      });
    }

    const validRoles = ['ADMIN', 'DRIVER', 'NGO'];
    let userRole = 'NGO';
    if (role && validRoles.includes(role.toUpperCase())) {
      userRole = role.toUpperCase();
    }

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A user already exists with this email address',
      });
    }
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User account is inactive.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile info (name, phone, organization, profileImage)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, organization, profileImage } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name) {
      if (name.length < 2 || name.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 60 characters',
        });
      }
      user.name = name.trim();
    }

    if (phone !== undefined) user.phone = phone.trim();
    if (organization !== undefined) user.organization = organization.trim();
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new passwords',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get role-specific operational metrics and activity logs for profile
// @route   GET /api/auth/profile-details
// @access  Private
exports.getProfileDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user._id;
    const role = user.role;

    const Shipment = require('../models/Shipment');
    const Order = require('../models/Order');
    const Vehicle = require('../models/Vehicle');
    const Route = require('../models/Route');
    const Alert = require('../models/Alert');
    const AuditLog = require('../models/AuditLog');

    let roleOperations = {};

    if (role === 'ADMIN') {
      const [totalUsers, totalShipments, activeShipments, activeAlerts, vehiclesCount, routesCount] = await Promise.all([
        User.countDocuments({}),
        Shipment.countDocuments({}),
        Shipment.countDocuments({ status: 'IN_TRANSIT' }),
        Alert.countDocuments({ status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } }),
        Vehicle.countDocuments({}),
        Route.countDocuments({})
      ]);

      roleOperations = {
        totalUsers,
        totalShipments,
        activeShipments,
        activeAlerts,
        vehiclesCount,
        routesCount
      };
    } else if (role === 'DRIVER') {
      const assignedShipments = await Shipment.find({ assignedDriver: userId }).sort({ updatedAt: -1 });
      const activeShipmentObj = assignedShipments.find(s => s.status === 'IN_TRANSIT') || assignedShipments[0] || null;
      const assignedVehicleObj = await Vehicle.findOne({ assignedDriver: userId }) || (activeShipmentObj?.assignedVehicle ? await Vehicle.findById(activeShipmentObj.assignedVehicle) : null);
      const activeAlertsCount = await Alert.countDocuments({
        $or: [{ assignedTo: userId }, { relatedShipment: { $in: assignedShipments.map(s => s._id) } }],
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] }
      });

      roleOperations = {
        assignedShipmentsCount: assignedShipments.length,
        activeShipmentId: activeShipmentObj ? activeShipmentObj.shipmentId : 'NO ACTIVE SHIPMENT',
        activeShipmentFrom: activeShipmentObj?.pickup?.locationName || 'N/A',
        activeShipmentTo: activeShipmentObj?.destination?.locationName || 'N/A',
        activeShipmentStatus: activeShipmentObj?.status || 'IDLE',
        assignedVehicleReg: assignedVehicleObj ? assignedVehicleObj.registrationNumber : 'NOT SPECIFIED',
        assignedVehicleType: assignedVehicleObj ? assignedVehicleObj.vehicleType : 'N/A',
        currentRouteName: activeShipmentObj?.selectedRoute?.name || 'No Route Selected',
        liveLocationStatus: activeShipmentObj?.liveLocation?.latitude ? 'Active GPS Signal' : 'Live location unavailable',
        activeAlertsCount
      };
    } else if (role === 'NGO') {
      const [totalOrders, activeOrders, completedOrders, totalShipments, activeShipments] = await Promise.all([
        Order.countDocuments({ requestedBy: userId }),
        Order.countDocuments({ requestedBy: userId, status: { $in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] } }),
        Order.countDocuments({ requestedBy: userId, status: 'COMPLETED' }),
        Shipment.countDocuments({ requestedBy: userId }),
        Shipment.countDocuments({ requestedBy: userId, status: 'IN_TRANSIT' })
      ]);

      const recentOrderObj = await Order.findOne({ requestedBy: userId }).sort({ createdAt: -1 });

      roleOperations = {
        organizationName: user.organization || 'NGO Organization',
        totalOrders,
        activeOrders,
        completedOrders,
        totalShipments,
        activeShipments,
        recentOrderId: recentOrderObj ? recentOrderObj.orderId : 'N/A',
        recentOrderStatus: recentOrderObj ? recentOrderObj.status : 'N/A'
      };
    }

    // Recent activity logs for this user
    let userAuditLogs = await AuditLog.find({
      $or: [{ user: userId }, { userName: user.name }]
    }).sort({ createdAt: -1 }).limit(10);

    const formattedAuditLogs = userAuditLogs.map(a => ({
      _id: a._id,
      timestamp: a.createdAt,
      action: a.action,
      module: a.module,
      description: a.description || `${a.action} performed`,
      status: a.status
    }));

    res.status(200).json({
      success: true,
      data: {
        roleOperations,
        recentActivity: formattedAuditLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile photo (multipart/form-data)
// @route   PUT /api/auth/profile/photo
// @access  Private
exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file to upload.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Clean up previous image file if it exists in local uploads directory
    if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', user.profileImage);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (unlinkErr) {
          console.error('Failed to remove old profile photo:', unlinkErr);
        }
      }
    }

    const relativeUrl = `/uploads/profile/${req.file.filename}`;
    user.profileImage = relativeUrl;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        user: formatUserResponse(user)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove profile photo
// @route   DELETE /api/auth/profile/photo
// @access  Private
exports.removeProfilePhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', user.profileImage);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (unlinkErr) {
          console.error('Failed to remove stored profile photo:', unlinkErr);
        }
      }
    }

    user.profileImage = '';
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Profile photo removed successfully',
      data: {
        user: formatUserResponse(user)
      }
    });
  } catch (error) {
    next(error);
  }
};

