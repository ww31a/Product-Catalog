import mongoose from 'mongoose';
import ProductService from '../services/product.service.js';
import StockHistoryService from '../services/stockHistory.service.js';
import OrderService from '../services/order.service.js';

const getSellerProductIds = async (sellerId) => {
  const products = await ProductService.findByOwnerWithSelect(sellerId, '_id');
  return products.map(p => p._id);
};

export const getBestSellingProducts = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const days = parseInt(req.query.days, 10) || 30;
    const limit = parseInt(req.query.limit, 10) || 10;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const sellerProductIds = await getSellerProductIds(sellerId);

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

    const result = bestSellers.map(stat => {
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

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        products: result
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLowStockAlert = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const threshold = 5;

    const products = await ProductService.findLowStockByOwner(
      sellerId,
      threshold
    );

    res.json({
      success: true,
      data: {
        threshold,
        count: products.length,
        products
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOutOfStockAlert = async (req, res) => {
  try {
    const sellerId = req.auth.userId;

    const products = await ProductService.findOutOfStockByOwner(sellerId);

    res.json({
      success: true,
      data: { count: products.length, products }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInStockAlert = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const threshold = 5;

    const products = await ProductService.findInStockByOwner(
      sellerId,
      threshold
    );

    res.json({
      success: true,
      data: {
        threshold,
        count: products.length,
        products
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStockSummary = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const threshold = 5;

    const totalProducts = await ProductService.countByOwner(sellerId);
    const outOfStock = await ProductService.countOutOfStockByOwner(sellerId);
    const lowStock = await ProductService.countLowStockByOwner(
      sellerId,
      threshold
    );
    const inStock = await ProductService.countInStockByOwner(
      sellerId,
      threshold
    );

    const inventoryValue = await ProductService.getInventoryValueByOwner(
      sellerId
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sellerProductIds = await getSellerProductIds(sellerId);

    const recentChanges = await StockHistoryService.countByProductIds(
      sellerProductIds,
      sevenDaysAgo
    );

    const recentIncreases = await StockHistoryService.countByProductIdsAndType(
      sellerProductIds,
      'add',
      sevenDaysAgo
    );

    const recentDecreases = await StockHistoryService.countByProductIdsAndType(
      sellerProductIds,
      'remove',
      sevenDaysAgo
    );

    res.json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeadStock = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const days = parseInt(req.query.days, 10) || 20;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const sellerProductIds = await getSellerProductIds(sellerId);

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

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        count: deadStockProducts.length,
        totalValue: deadStockValue,
        products: deadStockProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};