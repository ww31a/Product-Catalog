import SellerService from './seller.service.js';
import ProductService from './product.service.js';
import OrderService from './order.service.js';
import UserService from './user.service.js';
import StockHistoryService from './stockHistory.service.js';

class SuperAdminManagementService {
  // Get all sellers with pagination and search
  async getAllSellers(query, page = 1, limit = 10) {
    const sellers = await SellerService.findWithPagination(
      query,
      { createdAt: -1 },
      (page - 1) * limit,
      limit * 1,
      "-password"
    );

    const count = await SellerService.countDocuments(query);

    return {
      sellers,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      total: count
    };
  }

  // Delete a seller and all associated data
  async deleteSeller(sellerId) {
    const seller = await SellerService.delete(sellerId);
    if (!seller) {
      return null;
    }

    // Get all product IDs owned by this seller
    const sellerProducts = await ProductService.findByOwnerWithSelect(sellerId, "_id");
    const productIds = sellerProducts.map(p => p._id);

    // Delete stock history and products
    await StockHistoryService.deleteByProductIds(productIds);
    await ProductService.deleteByOwner(sellerId);

    return seller;
  }

  // Bulk delete sellers and all associated data
  async bulkDeleteSellers(sellerIds) {
    const deleteResult = await SellerService.bulkDelete(sellerIds);

    if (deleteResult.deletedCount === 0) {
      return null;
    }

    // Get all products owned by these sellers
    const sellerProducts = await ProductService.findByOwnersWithSelect(sellerIds, "_id");
    const productIds = sellerProducts.map(p => p._id);

    // Delete stock history and products
    await StockHistoryService.deleteByProductIds(productIds);
    await ProductService.deleteByOwners(sellerIds);

    return deleteResult;
  }

  // Get platform overview with statistics
  async getPlatformOverview() {
    // Get total counts
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

    // Get revenue statistics
    const revenueData = await OrderService.getRevenueStats();

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newUsers, newSellers, newOrders] = await Promise.all([
      UserService.countSince(thirtyDaysAgo),
      SellerService.countSince(thirtyDaysAgo),
      OrderService.countSince(thirtyDaysAgo)
    ]);

    return {
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
    };
  }

  // Get top sellers by revenue
  async getTopSellers(days = 30, limit = 10) {
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

    return topSellers.map(stat => {
      const seller = sellers.find(s => s._id.toString() === stat.sellerId.toString());
      return {
        seller,
        revenue: stat.totalRevenue,
        itemsSold: stat.totalItemsSold,
        orders: stat.orderCount
      };
    });
  }

  // Get all users with pagination and search
  async getAllUsers(query, page = 1, limit = 10) {
    const users = await UserService.findWithPagination(
      query,
      { createdAt: -1 },
      (page - 1) * limit,
      limit * 1,
      "-password -cartData"
    );

    const count = await UserService.countDocuments(query);

    return {
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      total: count
    };
  }

  // Get all products with pagination, search, and populate
  async getAllProducts(query, page = 1, limit = 10) {
    const products = await ProductService.findWithPaginationAndPopulate(
      query,
      { createdAt: -1 },
      (page - 1) * limit,
      limit * 1,
      "owner",
      "name email"
    );

    const count = await ProductService.countDocuments(query);

    return {
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      total: count
    };
  }

  // Get all orders with pagination, search, and populate
  async getAllOrders(query, page = 1, limit = 10) {
    const orders = await OrderService.findWithPaginationAndPopulate(
      query,
      { createdAt: -1 },
      (page - 1) * limit,
      limit * 1,
      "userId",
      "name email"
    );

    const count = await OrderService.countDocuments(query);

    return {
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      total: count
    };
  }
}

export default new SuperAdminManagementService();