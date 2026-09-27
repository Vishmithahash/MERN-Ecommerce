const { isObjectIdOrHexString } = require('mongoose')
const User = require('../models/User')

exports.loadAccount=async(req,res,next)=>{
    if(!isObjectIdOrHexString(req.user?._id)){
        return res.status(401).json({message:'Please login again'})
    }

    try {
        // Read the current role so an old token cannot retain admin access.
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

exports.requireOrderAdmin=(req,res,next)=>{
    if(req.user.isAdmin!==true){
        return res.status(403).json({message:'Administrator access required'})
    }
    return next()
}

exports.requireOrderOwner=(req,res,next)=>{
    if(!isObjectIdOrHexString(req.params.id)){
        return res.status(400).json({message:'Invalid user ID'})
    }
    if(String(req.user._id).toLowerCase()!==req.params.id.toLowerCase()){
        return res.status(403).json({message:'You can only view your own order history'})
    }
    return next()
}
