import express from 'express'
import dotenv from 'dotenv'
import blogRoutes from "./routes/blog.js"
import  {createClient} from 'redis'
import { startCacheConsumer } from './utils/consumer.js'
import cors from 'cors'
dotenv.config()
const PORT = process.env.PORT

const app = express()
app.use(express.json())

app.use(cors())
app.use("/api/v1",blogRoutes)

startCacheConsumer()

export const redisClient = createClient({
    url:process.env.REDIS_URL!
})

redisClient.connect().then(()=>console.log("Connected to Redis")).catch((err)=>console.error("Error in Connecing to redis: ",err))


app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`)
})
