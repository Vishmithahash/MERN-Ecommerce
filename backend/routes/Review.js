const express=require('express')
const reviewController=require("../controllers/Review")
const { verifyToken } = require('../middleware/VerifyToken')
const { loadAccount } = require('../middleware/ReviewAccess')
const router=express.Router()


router
    .post("/",verifyToken,loadAccount,reviewController.create)
    .get('/product/:id',reviewController.getByProductId)
    .patch('/:id',verifyToken,loadAccount,reviewController.updateById)
    .delete("/:id",verifyToken,loadAccount,reviewController.deleteById)

module.exports=router
