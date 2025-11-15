import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import TryCatch from "../utils/TryCatch.js";
import { sql } from "../utils/db.js";


export const getAllBlogs = TryCatch(async (req, res) => {
  const blogs = await sql`
    SELECT * FROM blogs 
    ORDER BY created_at DESC
  `;

  return res.json({
    blogs,
  });
});
