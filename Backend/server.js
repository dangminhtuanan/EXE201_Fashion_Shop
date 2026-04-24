const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const swaggerDocs = require("./swagger"); 
dotenv.config();
const app = express();


app.use(express.json());
app.use(cors());

app.use('/image', express.static('image'));

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", profileRoutes);
app.get("/", (req, res) => {
  res.send("API đang chạy! Thêm /docs để mở Swagger");
});

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Máy chủ chạy trên port ${PORT}`);
  swaggerDocs(app, PORT);
});
