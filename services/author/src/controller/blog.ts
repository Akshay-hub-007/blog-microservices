import type { RequestHandler, Response } from "express";
import TryCatch from "../utils/TryCatch.js";
import { v2 as cloudinary } from 'cloudinary'
import { sql } from "../utils/db.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import getbuffer from "../utils/datauri.js";
import { invalidateCacheJob } from "../utils/rabbitmq.js";
import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  invalidateCacheJob(["blogs:*", `blogid:${id}`])
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

    await invalidateCacheJob(["blogs:*"])
    return res.status(401).json({
      message: " Your are not the authot of the blog."
    })
  }



  await sql`DELETE FROM savedblogs where blogid = ${id}`;
  await sql`DELETE FROM comments where blogid = ${id}`
  await sql`DELETE FROM blogs where id = ${id}`

  invalidateCacheJob(["blogs:*", `blogid:${id}`])

  res.json({
    message: "Blog Deleted"
  })
})

export const aiTitleResponse = TryCatch(async (req: AuthenticatedRequest, res) => {
  console.log("object")
  const { text } = req.body

  const prompt = `Correct the grammar of the following blog title and return only the corrected
title without any additional text, formatting, or symbols: "${text}"`;

  const genai = new GoogleGenAI({
    apiKey: process.env.Google_Api_Key!
  })
  console.log("genai")
  let result;
  async function main() {
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    })

    let rawtext = response.text
    console.log(rawtext)
    if (!rawtext) {
      res.status(400).json({
        message: "Something went wrong!"
      })
      return;
    }

    result = rawtext.
      replace(/\*\*/g, "").
      replace(/[\r\n]+/g, "").
      replace(/[*_`~]/g, "").
      trim();

  }

  await main();

  res.json(result)
})


export const aiDescriptionResponse = TryCatch(async (req: AuthenticatedRequest, res) => {
  console.log("object")
  const { title, description } = req.body


  const prompt = description === "" ? `Generate only one short blog description based on
this title: "${title}". Your response must be only one sentence, strictly under 30 words, with no options, no
greetings, and no extra text. Do not explain. Do not say 'here is'. Just return the description only.` : `Fix the
grammar in the following blog description and return only the corrected sentence. Do not add anything else:
"${description}"`;
  const genai = new GoogleGenAI({
    apiKey: process.env.Google_Api_Key!
  })
  console.log("genai")
  let result;
  async function main() {
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    })

    let rawtext = response.text
    console.log(rawtext)
    if (!rawtext) {
      res.status(400).json({
        message: "Something went wrong!"
      })
      return;
    }

    result = rawtext.
      replace(/\*\*/g, "").
      replace(/[\r\n]+/g, "").
      replace(/[*_`~]/g, "").
      trim();

  }

  await main();

  res.json(result)
})

export const aiBlogResponse = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { blog } = req.body;

  if (!blog) {
    res.status(400).json({
      message: "Please provide Blog.",
    });
    return;
  }

  const prompt = `
You will act as a grammar correction engine. I will provide you with blog content
in rich HTML format (from Jodit Editor). Do not generate or rewrite the content with new ideas. Only correct
grammatical, punctuation, and spelling errors while preserving all HTML tags and formatting. Maintain inline styles,
image tags, line breaks, and structural tags exactly as they are. Return the full corrected HTML string as output.
`.trim();

  // ❌ Your version had: `${prompt}+'\n\n'+"Blog content:\n\n ${blog}`
  // That mixes template string + extra quotes and literally puts '+\n\n'+ in text.
  const fullMessage = `${prompt}\n\nBlog content:\n\n${blog}`;

  const ai = new GoogleGenerativeAI(process.env.Google_Api_Key!);
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: fullMessage }],
      },
    ],
  });

  const response = result.response.text();

  const cleanedText = response
    .replace(/```$/i, "")                      // 1
    .replace(/^(html|```html|```)\n?/i, "")    // 2
    .replace(/\*\*/g, "")                      // 3
    .replace(/[\r\n]+/g, "")                   // 4
    .replace(/[*_`~]/g, "")                    // 5
    .trim();

  res.status(200).json({ html: cleanedText });
});
