import type { RequestHandler, Response } from "express";
import TryCatch from "../utils/TryCatch.js";
import {v2 as cloudinary} from 'cloudinary'
import { sql } from "../utils/db.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import getbuffer from "../utils/datauri.js";
export const createBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { title, description, blogcontent, category } = req.body;

  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file to upload" });
  }

  const fileBuffer = getbuffer(file);

  if (!fileBuffer || !fileBuffer.content) {
    return res.status(400).json({
      message: "Failed to generate Buffer",
    });
  }

  const cloud = await cloudinary.uploader.upload(fileBuffer.content, {
    folder: "blogs",
  });

  const result = await sql`
    INSERT INTO blogs (title, description, image, blogcontent, category, author)
    VALUES (
      ${title},
      ${description},
      ${cloud.secure_url},
      ${blogcontent},
      ${category},
      ${req.user?._id}
    )
    RETURNING *
  `;

  return res.json({
    message: "Blog Created",
    blog: result[0],
  });
});
