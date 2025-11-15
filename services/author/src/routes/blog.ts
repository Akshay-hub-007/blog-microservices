import express from 'express'
import { createBlog, deleteBlog, updateBlog } from '../controller/blog.js'
import { isAuth } from '../middleware/isAuth.js'
import uploadFile from '../utils/multer.js'

const router = express.Router()

router.post("/blog/new",isAuth,uploadFile,createBlog)
router.post("/blog/:id",isAuth,uploadFile,updateBlog)
router.delete("/blog/:id",isAuth,deleteBlog)
export default router 