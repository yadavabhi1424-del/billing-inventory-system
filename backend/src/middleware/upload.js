import multer          from "multer";
import path            from "path";
import { AppError }    from "./errorHandler.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads"),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed  = /jpeg|jpg|png|webp/;
  const extname  = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);

  if (extname && mimetype) cb(null, true);
  else cb(new AppError("Only images are allowed (jpeg, jpg, png, webp)", 400));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: process.env.MAX_FILE_SIZE || 5242880 },
});

export default upload;