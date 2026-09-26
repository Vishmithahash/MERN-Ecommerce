const Order = require("../models/Order");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { calculateOrderTotal, OrderValidationError } = require("../utils/OrderPricing");

const getProductId = (item) => item && item.product && (item.product._id || item.product);

const buildAuthoritativeItems = async (requestedItems) => {
    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
        throw new OrderValidationError("An order must contain at least one item");
    }

    const productIds = requestedItems.map((item) => {
        const productId = getProductId(item);

        if (!mongoose.isValidObjectId(productId)) {
            throw new OrderValidationError("Every order item must contain a valid product id");
        }

        if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
            throw new OrderValidationError("Every order item quantity must be a positive integer");
        }

        return String(productId);
    });

    if (new Set(productIds).size !== productIds.length) {
        throw new OrderValidationError("Duplicate products are not allowed in an order");
    }

    const products = await Product.find({ _id: { $in: productIds } })
        .populate("brand")
        .exec();
    const productsById = new Map(products.map((product) => [String(product._id), product]));

    return requestedItems.map((requestedItem, index) => {
        const product = productsById.get(productIds[index]);

        if (!product || product.isDeleted) {
            throw new OrderValidationError(`Product ${productIds[index]} is unavailable`);
        }

        if (!Number.isSafeInteger(product.stockQuantity) || requestedItem.quantity > product.stockQuantity) {
            throw new OrderValidationError(`Requested quantity for product ${productIds[index]} is unavailable`);
        }

        const productSnapshot = typeof product.toObject === "function" ? product.toObject() : { ...product };

        return {
            product: productSnapshot,
            quantity: requestedItem.quantity,
        };
    });
};

exports.create=async(req,res)=>{
    try {
        const item = await buildAuthoritativeItems(req.body.item);
        const { total } = calculateOrderTotal(item);
        const created=new Order({
            user: req.body.user,
            item,
            address: req.body.address,
            paymentMode: req.body.paymentMode,
            total,
        })
        await created.save()
        res.status(201).json(created)
    } catch (error) {
        if (error instanceof OrderValidationError) {
            return res.status(400).json({message:error.message})
        }
        console.log(error);
        return res.status(500).json({message:'Error creating an order, please trying again later'})
    }
}

exports.getByUserId=async(req,res)=>{
    try {
        const {id}=req.params
        const results=await Order.find({user:id})
        res.status(200).json(results)
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:'Error fetching orders, please trying again later'})
    }
}

exports.getAll = async (req, res) => {
    try {
        let skip=0
        let limit=0

        if(req.query.page && req.query.limit){
            const pageSize=req.query.limit
            const page=req.query.page
            skip=pageSize*(page-1)
            limit=pageSize
        }

        const totalDocs=await Order.find({}).countDocuments().exec()
        const results=await Order.find({}).skip(skip).limit(limit).exec()

        res.header("X-Total-Count",totalDocs)
        res.status(200).json(results)

    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error fetching orders, please try again later'})
    }
};

exports.updateById=async(req,res)=>{
    try {
        const {id}=req.params
        const updateFields=Object.keys(req.body)

        if (updateFields.length !== 1 || updateFields[0] !== 'status') {
            return res.status(400).json({message:'Only order status can be updated'})
        }

        const updated=await Order.findByIdAndUpdate(id,{status:req.body.status},{new:true,runValidators:true})

        if (!updated) {
            return res.status(404).json({message:'Order not found'})
        }

        res.status(200).json(updated)
    } catch (error) {
        console.log(error);
        if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
            return res.status(400).json({message:'Invalid order update'})
        }
        res.status(500).json({message:'Error updating order, please try again later'})
    }
}

exports.buildAuthoritativeItems = buildAuthoritativeItems;
