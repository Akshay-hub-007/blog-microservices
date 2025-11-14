import express from "express";
import dotenv from "dotenv";
import connectDb from "./utils/db.js";
import userRoutes from "./routes/user.js";
import { v2 as cloudinary } from 'cloudinary'
dotenv.config();


const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME!,        
  api_key: process.env.CLOUD_API_KEY!,        
  api_secret: process.env.CLOUD_API_SECRET!,  
});

app.use(express.json());

connectDb();

app.use("/api/v1", userRoutes);

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});