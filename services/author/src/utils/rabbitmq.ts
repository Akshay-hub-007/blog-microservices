import amqp from 'amqplib'

let channel:amqp.Channel


export const connectRabbitMq = async()=>{
    try {
        const  connection =await amqp.connect(process.env.CLOUD_AMQP!)

        channel = await connection.createChannel()

        console.log("Connected to RabbitMq Successssfully")

    } catch (error) {
        console.error("Failed to connect to rabbitmq ",error)
    }   
}

export const publishToQueue = async(queueName:string, message:any)=> {
    try {
        
        if(!channel) {
            console.log("RabbitMq is not intialized");
            return;
        }

        await channel.assertQueue(queueName,{durable:true})

        channel.sendToQueue(queueName,Buffer.from(JSON.stringify(message)),{
            persistent:true
        })
    } catch (error) {
        
    }
}

export const invalidateCacheJob = async(cacheKeys:string[])=>{

    try {
        
        const message = {
            action :"invalidateCache",
            keys :cacheKeys
        }

        await publishToQueue("cache-invalidation",message)

        console.log("Cache invalidation job published to RabbitMq")
        
    } catch (error) {
                console.error("Failed to Publish cache on  rabbitmq ",error)

    }
}