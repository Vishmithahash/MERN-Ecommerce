require('dotenv').config()
const jwt=require('jsonwebtoken')

exports.generateToken=(payload,passwordReset=false)=>{
    const purpose = passwordReset ? "reset-password" : "login";
    const tokenPayload = {
        ...payload,
        purpose: purpose
    };
    return jwt.sign(tokenPayload,process.env.SECRET_KEY,{
        algorithm: 'HS256',
        expiresIn:passwordReset?process.env.PASSWORD_RESET_TOKEN_EXPIRATION:process.env.LOGIN_TOKEN_EXPIRATION
    })
}