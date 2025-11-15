import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import TryCatch from "../utils/TryCatch.js";
import { sql } from "../utils/db.js";

export const getAllBlogs = TryCatch(async (req, res) => {
  const { searchQuery, category } = req.query;

  const query = searchQuery ? `%${searchQuery}%` : null;

  let blogs;

  if (searchQuery && category) {
    blogs = await sql`
      SELECT * FROM blogs 
      WHERE (title ILIKE ${query} OR description ILIKE ${query})
      AND category = ${category}
      ORDER BY created_at DESC
    `;
  } 
  else if (searchQuery) {
    blogs = await sql`
      SELECT * FROM blogs 
      WHERE title ILIKE ${query} 
      OR description ILIKE ${query}
      ORDER BY created_at DESC
    `;
  } 
  else if (category) {
    blogs = await sql`
      SELECT * FROM blogs 
      WHERE category = ${category}
      ORDER BY created_at DESC
    `;
  } 
  else {
    blogs = await sql`
      SELECT * FROM blogs 
      ORDER BY created_at DESC
    `;
  }

  return res.json({ blogs });
});
