const express=require("express")
const userController=require("../controllers/User")
const { verifyToken } = require("../middleware/VerifyToken")
const router=express.Router()

router
    .get("/:id",verifyToken,userController.getById)
    .patch("/:id",verifyToken,userController.updateById)

module.exports=router