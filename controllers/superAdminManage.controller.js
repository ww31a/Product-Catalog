import mongoose from "mongoose";
import SellerService from "../services/seller.service.js";
import ProductService from "../services/product.service.js";
import OrderService from "../services/order.service.js";
import UserService from "../services/user.service.js";
import StockHistoryService from "../services/stockHistory.service.js";

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

        const sellers = await SellerService.findWithPagination(
            query,
            { createdAt: -1 },
            (page - 1) * limit,
            limit * 1,
            "-password"
        );

        const count = await SellerService.countDocuments(query);

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

        const seller = await SellerService.delete(sellerId);
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found"
            });
        }

        const sellerProducts = await ProductService.findByOwnerWithSelect(sellerId, "_id");
        const productIds = sellerProducts.map(p => p._id);

        await StockHistoryService.deleteByProductIds(productIds);
        await ProductService.deleteByOwner(sellerId);

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
        const { sellerIds } = req.body;

        if (!Array.isArray(sellerIds) || sellerIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of seller IDs"
            });
        }

        const invalidIds = sellerIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid seller IDs found",
                invalidIds
            });
        }

        const deleteResult = await SellerService.bulkDelete(sellerIds);

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No sellers found with provided IDs"
            });
        }

        const sellerProducts = await ProductService.findByOwnersWithSelect(sellerIds, "_id");
        const productIds = sellerProducts.map(p => p._id);

        await StockHistoryService.deleteByProductIds(productIds);
        await ProductService.deleteByOwners(sellerIds);

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
            UserService.count(),
            SellerService.count(),
            ProductService.countDocuments(),
            OrderService.count(),
        ]);

        const revenueData = await OrderService.getRevenueStats();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [newUsers, newSellers, newOrders] = await Promise.all([
            UserService.countSince(thirtyDaysAgo),
            SellerService.countSince(thirtyDaysAgo),
            OrderService.countSince(thirtyDaysAgo)
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
                    total: revenueData.totalRevenue || 0,
                    average: revenueData.averageOrderValue || 0
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

        const topSellers = await StockHistoryService.getTopSellersByRevenue(
            dateThreshold,
            limit
        );

        const sellerIds = topSellers.map(s => s.sellerId);
        const sellers = await SellerService.findByIdsWithSelect(
            sellerIds,
            "name email createdAt"
        );

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

        const users = await UserService.findWithPagination(
            query,
            { createdAt: -1 },
            (page - 1) * limit,
            limit * 1,
            "-password -cartData"
        );

        const count = await UserService.countDocuments(query);

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

        const products = await ProductService.findWithPaginationAndPopulate(
            query,
            { createdAt: -1 },
            (page - 1) * limit,
            limit * 1,
            "owner",
            "name email"
        );

        const count = await ProductService.countDocuments(query);

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
        
        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { paymentMethod: { $regex: search, $options: 'i' } }
            ];
        }

        const orders = await OrderService.findWithPaginationAndPopulate(
            query,
            { createdAt: -1 },
            (page - 1) * limit,
            limit * 1,
            "userId",
            "name email"
        );

        const count = await OrderService.countDocuments(query);

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