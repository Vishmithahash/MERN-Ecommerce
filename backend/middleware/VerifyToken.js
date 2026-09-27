require('dotenv').config()
const jwt=require('jsonwebtoken')
const { sanitizeUser } = require('../utils/SanitizeUser')

exports.verifyToken=async(req,res,next)=>{
    try {
        // extract the token from request cookies
        const {token}=req.cookies

        // if token is not there, return 401 response
        if(!token){
            return res.status(401).json({message:"Token missing, please login again"})
        }

        // verifies the token signature, algorithm, and expiry
        const decodedInfo=jwt.verify(token,process.env.SECRET_KEY,{ algorithms: ['HS256'] })

        // checks if decoded info contains legit details and login purpose
        if(decodedInfo && decodedInfo._id && decodedInfo.email && decodedInfo.purpose === 'login'){
            req.user=decodedInfo
            next()
        }

        // if token is invalid or does not have login purpose then sends 401 response
        else{
            return res.status(401).json({message:"Invalid Token, please login again"})
        }
        
    } catch (error) {

        console.log(error);
        
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Token expired, please login again" });
        } 
        else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "Invalid Token, please login again" });
        } 
        else {
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
}