import express from 'express'
import { aiBlogResponse, aiDescriptionResponse, aiTitleResponse, createBlog, deleteBlog, updateBlog } from '../controller/blog.js'
import { isAuth } from '../middleware/isAuth.js'
import uploadFile from '../utils/multer.js'

const router = express.Router()

router.post("/blog/new",isAuth,uploadFile,createBlog)
router.post("/blog/:id",isAuth,uploadFile,updateBlog)
router.delete("/blog/:id",isAuth,deleteBlog)
router.post("/ai/title",aiTitleResponse)
router.post("/ai/description",aiDescriptionResponse)
router.post("/ai/blog",aiBlogResponse)

export default router 