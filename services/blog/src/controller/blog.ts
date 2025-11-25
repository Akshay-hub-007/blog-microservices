import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import TryCatch from "../utils/TryCatch.js";
import { sql } from "../utils/db.js";
import axios from "axios";
import { redisClient } from "../server.js";
import { createClient } from "redis";

export const getAllBlogs = TryCatch(async (req, res) => {
  const { searchQuery = "", category = "" } = req.query;

  const cachekey = `blogs:${searchQuery}:${category}`
  const cached = await redisClient.get(cachekey)
  if (cached) {
    console.log("Serving from redis cache")
    res.json(JSON.parse(cached))
    return;
  }
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
  console.log("Serving from db")
  await redisClient.set(cachekey, JSON.stringify(blogs), { EX: 3600 })
  return res.json({ blogs },);
});

export const getSingleBlog = TryCatch(async (req, res) => {
  const blogid = req.params.id
  const cacheKey = `blogid:${blogid}`
  const cache = await redisClient.get(cacheKey);
  if (cache) {
    console.log("Serving fron redis")
    res.json(JSON.parse(cache));
    return;
  }

  const blog = await sql`SELECT * FROM blogs WHERE id = ${req.params.id}`;
  if (!blog.length) {
    return res.status(404).json({
      message: "Blog with the id does not exist"
    })

  }
  const { data } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${blog[0]?.author}`,)
  const response = { blog: blog[0], author: data }
  await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 })
  console.log("Serving from db")
  res.json({ blog: blog[0], author: data })
})

export const addComment = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id: blogid } = req.params;
  const { comment } = req.body;

  await sql`INSERT INTO comments (comment, blogid, userid, username) VALUES (${comment}, ${blogid}, ${req.user?._id}, ${req.user?.name}) RETURNING *`;

  res.json({
    message: "Comment Added",
  });
});
export const getAllComments = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  console.log("object")
  const blogs = await sql`
    SELECT * FROM comments WHERE blogid = ${id} ORDER BY created_at DESC
   `;

  res.json(blogs)
})

export const deleteComment = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { commentid } = req.params

  const comment = await sql`SELECT * FROM comments WHERE commentid = ${commentid}`

  if (comment[0]?.userid != req.user?._id) {
    res.status(401).json({
      message: "Your are not owner of the blog"
    })
    return;
  }

  await sql`DELETE comments WHERE id = ${commentid}`

  res.json({
    message: "Comment Deleted"
  })
})