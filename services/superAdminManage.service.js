import SellerService from './seller.service.js';
import ProductService from './product.service.js';
import OrderService from './order.service.js';
import UserService from './user.service.js';
import StockHistoryService from './stockHistory.service.js';
import AppUserService from './appUser.service.js';

class SuperAdminManagementService {

  async getAllSellers(query, page = 1, limit = 10) {
    let sellerQuery = {};

    // If there's a search term, first find matching AppUsers
    if (query.$or) {
      const matchingUsers = await AppUserService.find(
        {
          roles: "seller",
          $or: query.$or
        },
        "_id"
      );

      const userIds = matchingUsers.map(u => u._id);
      sellerQuery.userId = { $in: userIds };
    }

    // If there's a status filter, add it to seller query
    if (query.status) {
      sellerQuery.status = query.status;
    }

    // Get sellers with pagination
    const sellers = await SellerService.findWithPagination(
      sellerQuery,
      { createdAt: -1 },
      (page - 1) * limit,
      limit * 1,
      ""
    );

    // Populate name and email from AppUser
    const populatedSellers = await Promise.all(
      sellers.map(async seller => {
        const user = await AppUserService.findById(seller.userId, "name email");
        return {
          _id: seller._id,
          status: seller.status || "active",
          name: user?.name || "",
          email: user?.email || ""
        };
      })
    );

    // Count total sellers matching the criteria
    const count = await SellerService.countDocuments(sellerQuery);

    return {
      sellers: populatedSellers,
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
    let userQuery = {};

    // If there's a search term, first find matching AppUsers
    if (query.$or) {
      const matchingAppUsers = await AppUserService.find(
        {
          roles: "user",
          $or: query.$or
        },
        "_id"
      );

      const appUserIds = matchingAppUsers.map(u => u._id);
      userQuery.userId = { $in: appUserIds };
    }

    // Add any other filters from the original query (except $or)
    const { $or, ...otherFilters } = query;
    userQuery = { ...userQuery, ...otherFilters };

    // Get users with pagination
    const users = await UserService.findWithPagination(
      userQuery,
      { createdAt: -1 },
      (page - 1) * limit,
      limit
    );

    // Populate name & email from AppUser
    const populatedUsers = await Promise.all(
      users.map(async (u) => {
        const appUser = await AppUserService.findById(u.userId, "name email");
        return {
          _id: u._id,
          name: appUser?.name || null,
          email: appUser?.email || null,
          createdAt: u.createdAt
        };
      })
    );

    // Count total users matching the criteria
    const count = await UserService.countDocuments(userQuery);

    return {
      users: populatedUsers,
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