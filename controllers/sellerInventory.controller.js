import SellerInventoryService from '../services/sellerInventory.service.js';

export const getBestSellingProducts = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const days = parseInt(req.query.days, 10) || 30;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await SellerInventoryService.getBestSellingProducts(
      sellerId,
      days,
      limit
    );

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

    const products = await SellerInventoryService.getLowStockProducts(
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

    const products = await SellerInventoryService.getOutOfStockProducts(sellerId);

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

    const products = await SellerInventoryService.getInStockProducts(
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

    const data = await SellerInventoryService.getStockSummary(sellerId, threshold);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeadStock = async (req, res) => {
  try {
    const sellerId = req.auth.userId;
    const days = parseInt(req.query.days, 10) || 20;

    const result = await SellerInventoryService.getDeadStock(sellerId, days);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        count: result.count,
        totalValue: result.totalValue,
        products: result.products
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};