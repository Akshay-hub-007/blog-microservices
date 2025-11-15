import express from 'express'
import dotenv from 'dotenv'
import blogRoutes from "./routes/blog.js"
dotenv.config()
const PORT = process.env.PORT

const app = express()

app.use("/api/v1",blogRoutes)





app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`)
})
