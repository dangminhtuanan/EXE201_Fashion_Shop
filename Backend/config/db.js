const dns = require("dns");
const mongoose = require("mongoose"); 

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      (process.env.NODE_ENV === "production"
        ? undefined
        : "mongodb://127.0.0.1:27017/exe201_fashion_shop");

    if (!mongoUri) {
      throw new Error("Thieu MONGO_URI trong file Backend/.env");
    }

    if (mongoUri.startsWith("mongodb+srv://") && process.env.DNS_SERVERS) {
      dns.setServers(
        process.env.DNS_SERVERS.split(",")
          .map((server) => server.trim())
          .filter(Boolean)
      );
    }

    await mongoose.connect(mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB kết nối thành công");
  } catch (error) {
    console.error("MongoDB kết nối thất bại:", error.message);
    process.exit(1); 
  }
};

module.exports = connectDB; 
