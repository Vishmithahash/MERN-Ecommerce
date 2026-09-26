const User=require("../models/User")

exports.getById=async(req,res)=>{
    try {
        const {id}=req.params
        if(!req.user || !req.user._id){
            return res.status(401).json({message:"Unauthenticated"})
        }
        if(req.user._id.toString() !== id.toString() && !req.user.isAdmin){
            return res.status(403).json({message:"Forbidden: Cannot access another user's profile"})
        }
        const user=await User.findById(id)
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const result=user.toObject()
        delete result.password
        res.status(200).json(result)
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error getting your details, please try again later'})
    }
}
exports.updateById=async(req,res)=>{
    try {
        const {id}=req.params
        if(!req.user || !req.user._id){
            return res.status(401).json({message:"Unauthenticated"})
        }
        if(req.user._id.toString() !== id.toString() && !req.user.isAdmin){
            return res.status(403).json({message:"Forbidden: Cannot edit another user's profile"})
        }

        const updateData={...req.body}
        // Explicitly remove privileged and security-sensitive fields from general profile updates
        delete updateData.isAdmin
        delete updateData.isVerified
        delete updateData.googleId
        delete updateData.password
        delete updateData._id

        const updatedUser=await User.findByIdAndUpdate(id,updateData,{new:true})
        if(!updatedUser){
            return res.status(404).json({message:"User not found"})
        }
        const updated=updatedUser.toObject()
        delete updated.password
        res.status(200).json(updated)

    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error updating your details, please try again later'})
    }
}