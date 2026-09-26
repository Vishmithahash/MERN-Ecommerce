const Review=require("../models/Review")

const REVIEWER_PUBLIC_FIELDS='_id name'

const toPublicReview=(review)=>{
    if(!review){
        return review
    }

    const publicReview=typeof review.toObject==='function'?review.toObject():{...review}

    if(publicReview.user && typeof publicReview.user==='object' && publicReview.user.name!==undefined){
        publicReview.user={
            _id:publicReview.user._id,
            name:publicReview.user.name
        }
    }

    return publicReview
}

exports.create=async(req,res)=>{
    try {
        const created=new Review(req.body)
        await created.save()
        await created.populate({path:'user',select:REVIEWER_PUBLIC_FIELDS})
        res.status(201).json(toPublicReview(created))
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:'Error posting review, please trying again later'})
    }
}

exports.getByProductId=async(req,res)=>{
    try {
        const {id}=req.params
        let skip=0
        let limit=0

        if(req.query.page && req.query.limit){
            const pageSize=req.query.limit
            const page=req.query.page

            skip=pageSize*(page-1)
            limit=pageSize
        }

        const totalDocs=await Review.find({product:id}).countDocuments().exec()
        const result=await Review.find({product:id}).skip(skip).limit(limit).populate({path:'user',select:REVIEWER_PUBLIC_FIELDS}).exec()

        res.set("X-total-Count",totalDocs)
        res.status(200).json(result.map(toPublicReview))

    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error getting reviews for this product, please try again later'})
    }
}

exports.updateById=async(req,res)=>{
    try {
        const {id}=req.params
        const updated=await Review.findByIdAndUpdate(id,req.body,{new:true}).populate({path:'user',select:REVIEWER_PUBLIC_FIELDS})
        res.status(200).json(toPublicReview(updated))
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error updating review, please try again later'})
    }
}

exports.deleteById=async(req,res)=>{
    try {
        const {id}=req.params
        const deleted=await Review.findByIdAndDelete(id)
        res.status(200).json(deleted)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error deleting review, please try again later'})
    }
}
