import type { RequestHandler, Response } from "express";
import TryCatch from "../utils/TryCatch.js";
import { v2 as cloudinary } from 'cloudinary'
import { sql } from "../utils/db.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import getbuffer from "../utils/datauri.js";
import { invalidateCacheJob } from "../utils/rabbitmq.js";


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

   await invalidateCacheJob(["blogs*"])
  return res.json({
    message: "Blog Created",
    blog: result[0],
  });
});

export const updateBlog = TryCatch(async (req: AuthenticatedRequest, res) => {

  const { id } = req.params

  const { title, description, blogcontent, category } = req.body

  const file = req.file

  const blog = await sql`
   SELECT * FROM blogs WHERE id = ${id} `;
  if (!blog.length) {

    return res.status(404).json({
      message: "No blog with this id"
    })
  }
  if (blog[0]?.author != req.user?._id) {
    return res.status(401).json({
      message: "Your are not author og this blog"
    })
  }
  let imageUrl = blog[0]?.image
  if (file) {

    const fileBuffer = getbuffer(file)

    if (!fileBuffer || !fileBuffer.content) {
      res.status(400).json({
        message: "Failed to generate buffer",
      });
      return;
    }

    const cloud = await cloudinary.uploader.upload(fileBuffer.content, {
      folder: "blogs"
    })
    if (cloud.secure_url) {
      if (imageUrl) {
        await cloudinary.uploader.destroy(imageUrl).then(() => {
          console.log("previous image deleted successfully")
        }).catch((err) => {
          console.log("error in deleting previouos image", err)
        })
      }
      imageUrl = cloud.secure_url
    }
  }

  const updateblog = await sql`
  UPDATE blogs SET 
  title = ${title || blog[0]?.title},
  description = ${description || blog[0]?.description},
  category = ${category || blog[0]?.category},
  blogcontent = ${blogcontent || blog[0]?.blogcontent} ,
  image = ${imageUrl}

  WHERE id = ${id} 

  RETURNING *
  `;
  invalidateCacheJob(["blogs:*",`blogid:${id}`])
  res.json({
    message: "Blog Updated",
    blog: updateblog
  })
})

export const deleteBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const blog = await sql`
  SELECT * FROM blogs where id = ${id} 
  `
  console.log(id)
  if (!blog.length) {
    return res.status(404).json({
      message: "Blog is not Found."
    })
  }
  if (blog[0]?.author != req.user?._id) {

    return res.status(401).json({
      message: " Your are not the authot of the blog."
    })
  }



  await sql`DELETE FROM savedblogs where blogid = ${id}`;
  await sql`DELETE FROM comments where blogid = ${id}`
  await sql`DELETE FROM blogs where id = ${id}`

    invalidateCacheJob(["blogs:*",`blogid:${id}`])

  res.json({
    message: "Blog Deleted"
  })
})