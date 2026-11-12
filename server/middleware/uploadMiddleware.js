const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/profile');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Re-verify directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user ? req.user._id.toString() : 'guest';
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `profile-${userId}-${uniqueSuffix}${ext}`);
  }
});

// File filter for image formats (JPEG, JPG, PNG, WEBP)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error('Unsupported image format. Please select a JPG, PNG, JPEG, or WEBP image file.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Initialize multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3 MB
  },
  fileFilter
});

// Single file upload middleware for field 'profileImage' with clean error handling
const uploadProfilePhotoMiddleware = (req, res, next) => {
  const singleUpload = upload.single('profileImage');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds 3 MB limit. Please select a smaller image.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      }
      if (err.code === 'INVALID_FILE_TYPE' || err.message) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file uploaded.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Failed to process file upload.'
      });
    }
    next();
  });
};

module.exports = {
  uploadProfilePhotoMiddleware,
  uploadDir
};
