import express from 'express'
import { addComment, deleteComment, getAllBlogs, getAllComments, getSingleBlog } from '../controller/blog.js'
import isAuth from '../middleware/isAuth.js'

const router = express.Router()

router.get("/blog/all",getAllBlogs)
router.get("/blog/:id",getSingleBlog)
router.post("/comment/:id",isAuth, addComment)
router.delete("/comment/:id",isAuth,deleteComment)
router.get("/comment/:id",getAllComments)
export default router