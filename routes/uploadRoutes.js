const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router({ mergeParams: true });

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const filename = `flyker-last.apk`;
    cb(null, filename);
  },
});

const upload = multer({
    storage, 
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB file size limit
});

// Route for uploading APK file (Admin only)
router.post('/upload-apk', upload.single('apk'), (req, res) => {
  console.log('Request Body:', req.body); // Debug: Log the request body
  console.log('Uploaded File:', req.file); // Debug: Log the uploaded file

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { version, releaseNotes } = req.body;

  if (!version) {
    return res.status(400).json({ message: 'Version is required' });
  }

  if (!releaseNotes) {
    return res.status(400).json({ message: 'Release notes are required' });
  }

  // Save APK metadata (e.g., in a database)
  const apkData = {
    version,
    releaseNotes,
    filePath: `uploads/flyker-last.apk`,
    releaseDate: new Date(),
  };

  // For simplicity, we'll save metadata in a JSON file
  const apkMetadataPath = path.join(__dirname, '../apk-metadata.json');
  let metadata = [];
  if (fs.existsSync(apkMetadataPath)) {
    metadata = JSON.parse(fs.readFileSync(apkMetadataPath));
  }
  metadata.push(apkData);
  fs.writeFileSync(apkMetadataPath, JSON.stringify(metadata, null, 2));

  res.status(200).json({ message: 'APK uploaded successfully', apkData });
});

// Route for checking the latest APK version (For Flutter app)
router.get('/check-update', (req, res) => {
  const apkMetadataPath = path.join(__dirname, '../apk-metadata.json');
  if (!fs.existsSync(apkMetadataPath)) {
    return res.status(404).json({ message: 'No APK versions found' });
  }

  const metadata = JSON.parse(fs.readFileSync(apkMetadataPath));
  const latestVersion = metadata[metadata.length - 1]; // Get the latest version

  res.status(200).json(latestVersion);
});

module.exports = router;