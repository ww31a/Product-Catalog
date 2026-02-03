import ProductService from './product.service.js';
import OrderService from './order.service.js';
import StockHistoryService from './stockHistory.service.js';

class SellerInventoryService {
  // Helper: Get all product IDs for a seller
  async getSellerProductIds(sellerId) {
    const products = await ProductService.findByOwnerWithSelect(sellerId, '_id');
    return products.map(p => p._id);
  }

  // Get best selling products for a seller
  async getBestSellingProducts(sellerId, days = 30, limit = 10) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const sellerProductIds = await this.getSellerProductIds(sellerId);

    const bestSellers = await OrderService.getBestSellingProductsForSeller(
      sellerProductIds,
      dateThreshold,
      limit
    );

    const productIds = bestSellers.map(item => item._id);

    const products = await ProductService.findByOwnerAndIdsWithSelect(
      sellerId,
      productIds,
      'title brand price stock image'
    );

    return bestSellers.map(stat => {
      const product = products.find(
        p => p._id.toString() === stat._id.toString()
      );

      return {
        product: product
          ? {
              _id: product._id,
              title: product.title,
              brand: product.brand,
              price: product.price,
              stock: product.stock,
              image: product.image
            }
          : null,
        totalSold: stat.totalSold,
        salesCount: stat.salesCount,
        revenue: stat.totalRevenue
      };
    });
  }

  // Get low stock products for a seller
  async getLowStockProducts(sellerId, threshold = 5) {
    return await ProductService.findLowStockByOwner(sellerId, threshold);
  }

  // Get out of stock products for a seller
  async getOutOfStockProducts(sellerId) {
    return await ProductService.findOutOfStockByOwner(sellerId);
  }

  // Get in stock products for a seller
  async getInStockProducts(sellerId, threshold = 5) {
    return await ProductService.findInStockByOwner(sellerId, threshold);
  }

  // Get comprehensive stock summary for a seller
  async getStockSummary(sellerId, threshold = 5) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ✅ PARALLEL EXECUTION - All queries run simultaneously
    const [
      totalProducts,
      outOfStock,
      lowStock,
      inStock,
      inventoryValue,
      sellerProductIds
    ] = await Promise.all([
      ProductService.countByOwner(sellerId),
      ProductService.countOutOfStockByOwner(sellerId),
      ProductService.countLowStockByOwner(sellerId, threshold),
      ProductService.countInStockByOwner(sellerId, threshold),
      ProductService.getInventoryValueByOwner(sellerId),
      this.getSellerProductIds(sellerId)
    ]);

    // ✅ Second batch - depends on sellerProductIds from first batch
    const [recentChanges, recentIncreases, recentDecreases] = await Promise.all([
      StockHistoryService.countByProductIds(sellerProductIds, sevenDaysAgo),
      StockHistoryService.countByProductIdsAndType(sellerProductIds, 'add', sevenDaysAgo),
      StockHistoryService.countByProductIdsAndType(sellerProductIds, 'remove', sevenDaysAgo)
    ]);

    return {
      stockStatus: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock
      },
      inventoryValue: {
        totalValue: inventoryValue.totalValue || 0,
        totalUnits: inventoryValue.totalUnits || 0
      },
      recentActivity: {
        last7Days: recentChanges,
        increases: recentIncreases,
        decreases: recentDecreases
      }
    };
  }

  // Get dead stock products (products with no activity)
  async getDeadStock(sellerId, days = 20) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const sellerProductIds = await this.getSellerProductIds(sellerId);

    const recentlyChangedProducts = await StockHistoryService.getDistinctProductIds(
      sellerProductIds,
      dateThreshold
    );

    const deadStockProducts = await ProductService.findDeadStock(
      sellerProductIds,
      recentlyChangedProducts
    );

    const deadStockValue = deadStockProducts.reduce(
      (sum, product) => sum + product.price * product.stock,
      0
    );

    return {
      products: deadStockProducts,
      count: deadStockProducts.length,
      totalValue: deadStockValue
    };
  }
}

export default new SellerInventoryService();