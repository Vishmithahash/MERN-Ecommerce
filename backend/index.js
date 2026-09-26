require("dotenv").config()
const express=require('express')
const cors=require('cors')
const morgan=require("morgan")
const cookieParser=require("cookie-parser")
const authRoutes=require("./routes/Auth")
const productRoutes=require("./routes/Product")
const orderRoutes=require("./routes/Order")
const cartRoutes=require("./routes/Cart")
const brandRoutes=require("./routes/Brand")
const categoryRoutes=require("./routes/Category")
const userRoutes=require("./routes/User")
const addressRoutes=require('./routes/Address')
const reviewRoutes=require("./routes/Review")
const wishlistRoutes=require("./routes/Wishlist")
const { connectToDB } = require("./database/db")


// server init
const server=express()

// middlewares
server.use(cors({origin:process.env.ORIGIN,credentials:true,exposedHeaders:['X-Total-Count'],methods:['GET','POST','PATCH','DELETE']}))
server.use(express.json())
server.use(cookieParser())
server.use(morgan("tiny"))

// routeMiddleware
server.use("/auth",authRoutes)
server.use("/users",userRoutes)
server.use("/products",productRoutes)
server.use("/orders",orderRoutes)
server.use("/cart",cartRoutes)
server.use("/brands",brandRoutes)
server.use("/categories",categoryRoutes)
server.use("/address",addressRoutes)
server.use("/reviews",reviewRoutes)
server.use("/wishlist",wishlistRoutes)

server.get("/",(req,res)=>{
    res.status(200).json({message:'running'})
})

const PORT = process.env.PORT || 5000

const startServer = async () => {
    const requiredEnvVars = ['MONGO_URI', 'SECRET_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'ORIGIN', 'FRONTEND_URL'];
    const invalidVars = requiredEnvVars.filter(v => !process.env[v] || process.env[v].includes('REPLACE_WITH_'));
    if (invalidVars.length > 0) {
        console.error(`[Startup Error] Missing or unconfigured environment variables: ${invalidVars.join(', ')}`);
        process.exit(1);
    }

    try {
        await connectToDB();
        server.listen(PORT, () => {
            console.log(`server [STARTED] ~ http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(`[Startup Error] Could not start server: ${error.message}`);
        process.exit(1);
    }
};

startServer();