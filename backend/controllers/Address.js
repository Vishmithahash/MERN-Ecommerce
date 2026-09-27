const Address = require("../models/Address")

const canAccessAddress=(req,address)=>{
    return req.user && (req.user.isAdmin === true || req.user._id.toString() === address.user.toString())
}

const getSafeAddressData=(body)=>{
    const allowedFields=['street','city','state','phoneNumber','postalCode','country','type']
    const safeData={}

    allowedFields.forEach((field)=>{
        if(body[field] !== undefined){
            safeData[field]=body[field]
        }
    })

    return safeData
}

exports.create=async(req,res)=>{
    try {
        const created=new Address({...getSafeAddressData(req.body),user:req.user._id})
        await created.save()
        res.status(201).json(created)
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:'Error adding address, please trying again later'})
    }
}

exports.getByUserId = async (req, res) => {
    try {
        const {id}=req.params
        if(req.user._id.toString() !== id.toString() && req.user.isAdmin !== true){
            return res.status(403).json({message:"Forbidden: Cannot access another user's addresses"})
        }

        const results=await Address.find({user:id})
        res.status(200).json(results)
    
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error fetching addresses, please try again later'})
    }
};

exports.updateById=async(req,res)=>{
    try {
        const {id}=req.params
        const address=await Address.findById(id)

        if(!address){
            return res.status(404).json({message:"Address not found"})
        }

        if(!canAccessAddress(req,address)){
            return res.status(403).json({message:"Forbidden: Cannot update another user's address"})
        }

        const updated=await Address.findByIdAndUpdate(id,getSafeAddressData(req.body),{new:true})
        res.status(200).json(updated)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error updating address, please try again later'})
    }
}

exports.deleteById=async(req,res)=>{
    try {
        const {id}=req.params
        const address=await Address.findById(id)

        if(!address){
            return res.status(404).json({message:"Address not found"})
        }

        if(!canAccessAddress(req,address)){
            return res.status(403).json({message:"Forbidden: Cannot delete another user's address"})
        }

        const deleted=await Address.findByIdAndDelete(id)
        res.status(200).json(deleted)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error deleting address, please try again later'})
    }
}


