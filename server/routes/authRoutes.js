const express = require('express');
const { register, login, getMe, updateProfile, changePassword, getProfileDetails, uploadProfilePhoto, removeProfilePhoto } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfilePhotoMiddleware } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/profile/photo', protect, uploadProfilePhotoMiddleware, uploadProfilePhoto);
router.delete('/profile/photo', protect, removeProfilePhoto);
router.put('/change-password', protect, changePassword);
router.get('/profile-details', protect, getProfileDetails);

module.exports = router;
