const { isObjectIdOrHexString } = require('mongoose')
const User = require('../models/User')

exports.loadAccount=async(req,res,next)=>{
    if(!isObjectIdOrHexString(req.user?._id)){
        return res.status(401).json({message:'Please login again'})
    }

    try {
        const account=await User.findById(req.user._id).select('_id isAdmin')
        if(!account){
            return res.status(401).json({message:'Account not found, please login again'})
        }
        req.user={...req.user,_id:account._id,isAdmin:account.isAdmin===true}
        return next()
    } catch (error) {
        return res.status(500).json({message:'Unable to verify account access'})
    }
}
