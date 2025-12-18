import mongoose from "mongoose";
import SuperAdminManagementService from "../services/superAdminManage.service.js";

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

        const data = await SuperAdminManagementService.getAllSellers(query, page, limit);

        res.json({
            success: true,
            data
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

        const seller = await SuperAdminManagementService.deleteSeller(sellerId);
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found"
            });
        }

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

        const deleteResult = await SuperAdminManagementService.bulkDeleteSellers(sellerIds);

        if (!deleteResult) {
            return res.status(404).json({
                success: false,
                message: "No sellers found with provided IDs"
            });
        }

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
        const data = await SuperAdminManagementService.getPlatformOverview();

        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTopSellers = async (req, res) => {
    try {
        const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 10, 100));
        const days = Math.max(1, Math.min(parseInt(req.query.days) || 30, 365));

        const sellers = await SuperAdminManagementService.getTopSellers(days, limit);

        res.json({
            success: true,
            data: {
                period: `${days} days`,
                sellers
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

        const data = await SuperAdminManagementService.getAllUsers(query, page, limit);

        res.json({
            success: true,
            data
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

        const data = await SuperAdminManagementService.getAllProducts(query, page, limit);

        res.json({
            success: true,
            data
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

        const data = await SuperAdminManagementService.getAllOrders(query, page, limit);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};