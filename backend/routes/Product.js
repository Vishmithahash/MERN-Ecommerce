const express=require('express')
const productController=require("../controllers/Product")
const { verifyToken } = require('../middleware/VerifyToken')
const { requireAdmin } = require('../middleware/RequireAdmin')
const router=express.Router()

router
    .post("/",verifyToken,requireAdmin,productController.create)
    .get("/",productController.getAll)
    .get("/:id",productController.getById)
    .patch("/:id",verifyToken,requireAdmin,productController.updateById)
    .patch("/undelete/:id",verifyToken,requireAdmin,productController.undeleteById)
    .delete("/:id",verifyToken,requireAdmin,productController.deleteById)

module.exports=router
