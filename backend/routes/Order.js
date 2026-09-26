const express=require('express')
const orderController=require("../controllers/Order")
const { verifyToken } = require('../middleware/VerifyToken')
const { loadAccount, requireOrderAdmin, requireOrderOwner } = require('../middleware/OrderAccess')
const router=express.Router()


router
    .post("/",orderController.create)
    .get("/",verifyToken,loadAccount,requireOrderAdmin,orderController.getAll)
    .get("/user/:id",verifyToken,loadAccount,requireOrderOwner,orderController.getByUserId)
    .patch("/:id",verifyToken,loadAccount,requireOrderAdmin,orderController.updateById)


module.exports=router
