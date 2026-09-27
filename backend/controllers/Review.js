const Review=require("../models/Review")
const { isObjectIdOrHexString } = require('mongoose')

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
        const {product,rating,comment}=req.body
        const created=await new Review({product,rating,comment,user:req.user._id}).populate({path:'user',select:"-password"})
        await created.save()
        await created.populate({path:'user',select:REVIEWER_PUBLIC_FIELDS})
        res.status(201).json(toPublicReview(created))
    } catch (error) {
        if(error.name==='ValidationError' || error.name==='CastError'){
            return res.status(400).json({message:'Invalid review data'})
        }
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

exports.updateById = async (req, res) => {
    try {
        const { id } = req.params

        if (!isObjectIdOrHexString(id)) {
            return res.status(400).json({ message: 'Invalid review ID' })
        }

        const changes = {}
        for (const field of ['rating', 'comment']) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                changes[field] = req.body[field]
            }
        }

        if (Object.keys(changes).length === 0) {
            return res.status(400).json({ message: 'Provide a rating or comment to update' })
        }

        const filter = { _id: id }
        if (!req.user.isAdmin) {
            filter.user = req.user._id
        }

        const updated = await Review.findOneAndUpdate(
            filter,
            { $set: changes },
            { new: true, runValidators: true }
        ).populate({ path: 'user', select: REVIEWER_PUBLIC_FIELDS })

        if (!updated) {
            return res.status(404).json({ message: 'Review not found or not accessible' })
        }

        return res.status(200).json(toPublicReview(updated))
    } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid review data' })
        }
        console.log(error)
        return res.status(500).json({ message: 'Error updating review, please try again later' })
    }
}

exports.deleteById=async(req,res)=>{
    try {
        const {id}=req.params
        if(!isObjectIdOrHexString(id)){
            return res.status(400).json({message:'Invalid review ID'})
        }

        const filter={_id:id}
        if(!req.user.isAdmin){
            filter.user=req.user._id
        }

        const deleted=await Review.findOneAndDelete(filter)
        if(!deleted){
            return res.status(404).json({message:'Review not found or not accessible'})
        }
        res.status(200).json(deleted)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error deleting review, please try again later'})
    }
}
