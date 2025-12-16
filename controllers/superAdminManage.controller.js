import Seller from "../models/seller.module.js";
import Product from "../models/products.module.js";
import Order from "../models/order.module.js";
import User from "../models/user.module.js";
import stockHistory from "../models/stockHistory.module.js";
import mongoose from "mongoose";


export const getAllSellers = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const sellers = await Seller.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Seller.countDocuments(query);

        res.json({
            success: true,
            data: {
                sellers,
                totalPages: Math.ceil(count / limit),
                currentPage: Number(page),
                total: count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const deleteSeller = async (req, res) => {
    try {
        const { sellerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid seller ID"
            });
        }

        const seller = await Seller.findByIdAndDelete(sellerId);
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found"
            });
        }

        const sellerProducts = await Product.find({ owner: sellerId }).select("_id");
        const productIds = sellerProducts.map(p => p._id);

        await stockHistory.deleteMany({ productId: { $in: productIds } });

        await Product.deleteMany({ owner: sellerId });

        res.json({
            success: true,
            message: "Seller and associated data deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const bulkDeleteSellers = async (req, res) => {
    try {
        const { sellerIds } = req.body; // Expecting an array of seller IDs

        if (!Array.isArray(sellerIds) || sellerIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of seller IDs"
            });
        }

        // Validate all IDs
        const invalidIds = sellerIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid seller IDs found",
                invalidIds
            });
        }

        // Delete sellers
        const deleteResult = await Seller.deleteMany({ _id: { $in: sellerIds } });

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No sellers found with provided IDs"
            });
        }

        // Get all products owned by these sellers
        const sellerProducts = await Product.find({ owner: { $in: sellerIds } }).select("_id");
        const productIds = sellerProducts.map(p => p._id);

        // Delete stock history and products
        await stockHistory.deleteMany({ productId: { $in: productIds } });
        await Product.deleteMany({ owner: { $in: sellerIds } });

        res.json({
            success: true,
            message: `${deleteResult.deletedCount} seller(s) and associated data deleted successfully`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getPlatformOverview = async (req, res) => {
    try {
        const [
            totalUsers,
            totalSellers,
            totalProducts,
            totalOrders,
        ] = await Promise.all([
            User.countDocuments(),
            Seller.countDocuments(),
            Product.countDocuments(),
            Order.countDocuments(),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { payment: true } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" },
                    averageOrderValue: { $avg: "$amount" }
                }
            }
        ]);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [newUsers, newSellers, newOrders] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
            Seller.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
            Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalSellers,
                    totalProducts,
                    totalOrders
                },
                revenue: {
                    total: revenueData[0]?.totalRevenue || 0,
                    average: revenueData[0]?.averageOrderValue || 0
                },
                recentActivity: {
                    newUsers,
                    newSellers,
                    newOrders,
                    period: "Last 30 days"
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getTopSellers = async (req, res) => {
    try {
        const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 10, 100));
        const days = Math.max(1, Math.min(parseInt(req.query.days) || 30, 365));

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        const topSellers = await stockHistory.aggregate([
            {
                $match: {
                    type: "remove",
                    reason: "sale",
                    createdAt: { $gte: dateThreshold }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.owner",
                    totalRevenue: { $sum: { $multiply: ["$product.price", { $abs: "$change" }] } },
                    totalItemsSold: { $sum: { $abs: "$change" } },
                    orderCount: { $addToSet: "$orderId" }
                }
            },
            {
                $project: {
                    sellerId: "$_id",
                    totalRevenue: 1,
                    totalItemsSold: 1,
                    orderCount: { $size: "$orderCount" }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: limit }
        ]);

        const sellerIds = topSellers.map(s => s.sellerId);
        const sellers = await Seller.find({ _id: { $in: sellerIds } })
            .select("name email createdAt");

        const result = topSellers.map(stat => {
            const seller = sellers.find(s => s._id.toString() === stat.sellerId.toString());
            return {
                seller,
                revenue: stat.totalRevenue,
                itemsSold: stat.totalItemsSold,
                orders: stat.orderCount
            };
        });

        res.json({
            success: true,
            data: {
                period: `${days} days`,
                sellers: result
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const users = await User.find(query)
            .select("-password -cartData")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                totalPages: Math.ceil(count / limit),
                currentPage: Number(page),
                total: count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getAllProducts = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 10 } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } }
            ];
        }
        if (category) query.category = category;

        const products = await Product.find(query)
            .populate("owner", "name email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Product.countDocuments(query);

        res.json({
            success: true,
            data: {
                products,
                totalPages: Math.ceil(count / limit),
                currentPage: Number(page),
                total: count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getAllOrders = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        const query = {};
        
        // Filter by status
        if (status) {
            query.status = status;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { paymentMethod: { $regex: search, $options: 'i' } }
            ];
        }

        const orders = await Order.find(query)
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Order.countDocuments(query);

        res.json({
            success: true,
            data: {
                orders,
                totalPages: Math.ceil(count / limit),
                currentPage: Number(page),
                total: count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};