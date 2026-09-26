const mongoose=require("mongoose")
const {Schema}=mongoose

const otpSchema=new Schema({
    user:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
        unique:true
    },
    otp:{
        type:String,
        required:true
    },
    expiresAt:{
        type:Date,
        required:true
    },
    attempts:{
        type:Number,
        default:0
    },
    lockUntil:{
        type:Date,
        default:null
    }
})

module.exports=mongoose.model("OTP",otpSchema)