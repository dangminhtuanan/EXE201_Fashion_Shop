// controllers/uploadController.js
const cloudinary = require('../config/cloudinary');

const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn một file ảnh' });
    }

    // Luồng upload lên Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'exe201_fashion_shop' }, 
      (error, result) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          return res.status(500).json({ message: 'Lỗi upload ảnh lên Cloud' });
        }
        
        return res.status(200).json({
          message: 'Upload thành công',
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error("Controller Error:", error);
    return res.status(500).json({ message: 'Lỗi server khi upload' });
  }
};

module.exports = {
  uploadImage
};