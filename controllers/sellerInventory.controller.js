import mongoose from 'mongoose'
import Product from '../models/products.module.js'
import StockHistory from '../models/stockHistory.module.js'
import Order from '../models/order.module.js'

const getSellerProductIds = async (sellerId) => {
  const products = await Product.find({ owner: sellerId }).select('_id')
  return products.map(p => p._id)
}

export const getBestSellingProducts = async (req, res) => {
  try {
    const sellerId = req.auth.userId
    const days = parseInt(req.query.days, 10) || 30
    const limit = parseInt(req.query.limit, 10) || 10

    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    const sellerProductIds = await getSellerProductIds(sellerId)

    const bestSellers = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: dateThreshold }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items._id': { $in: sellerProductIds }
        }
      },
      {
        $group: {
          _id: '$items._id',
          totalSold: { $sum: '$items.quantity' },
          salesCount: { $sum: 1 },
          totalRevenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] }
          }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ])

    const productIds = bestSellers.map(item => item._id)

    const products = await Product.find({
      _id: { $in: productIds },
      owner: sellerId
    }).select('title brand price stock image')

    const result = bestSellers.map(stat => {
      const product = products.find(
        p => p._id.toString() === stat._id.toString()
      )

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
      }
    })

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        products: result
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getLowStockAlert = async (req, res) => {
  try {
    const sellerId = req.auth.userId
    const threshold = 5

    const products = await Product.find({
      owner: sellerId,
      stock: { $gt: 0, $lte: threshold }
    })
      .populate('owner', 'name email')
      .sort({ stock: 1 })

    res.json({
      success: true,
      data: {
        threshold,
        count: products.length,
        products
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getOutOfStockAlert = async (req, res) => {
  try {
    const sellerId = req.auth.userId

    const products = await Product.find({
      owner: sellerId,
      stock: 0
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 })

    res.json({
      success: true,
      data: { count: products.length, products }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getInStockAlert = async (req, res) => {
  try {
    const sellerId = req.auth.userId
    const threshold = 5

    const products = await Product.find({
      owner: sellerId,
      stock: { $gt: threshold }
    })
      .populate('owner', 'name email')
      .sort({ stock: -1 })

    res.json({
      success: true,
      data: {
        threshold,
        count: products.length,
        products
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getStockSummary = async (req, res) => {
  try {
    const sellerId = req.auth.userId
    const threshold = 5

    const totalProducts = await Product.countDocuments({ owner: sellerId })
    const outOfStock = await Product.countDocuments({ owner: sellerId, stock: 0 })
    const lowStock = await Product.countDocuments({
      owner: sellerId,
      stock: { $gt: 0, $lte: threshold }
    })
    const inStock = await Product.countDocuments({
      owner: sellerId,
      stock: { $gt: threshold }
    })

    const valueResult = await Product.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: { $multiply: ['$price', '$stock'] }
          },
          totalUnits: { $sum: '$stock' }
        }
      }
    ])

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const sellerProductIds = await getSellerProductIds(sellerId)

    const recentChanges = await StockHistory.countDocuments({
      productId: { $in: sellerProductIds },
      createdAt: { $gte: sevenDaysAgo }
    })

    const recentIncreases = await StockHistory.countDocuments({
      productId: { $in: sellerProductIds },
      type: 'add',
      createdAt: { $gte: sevenDaysAgo }
    })

    const recentDecreases = await StockHistory.countDocuments({
      productId: { $in: sellerProductIds },
      type: 'remove',
      createdAt: { $gte: sevenDaysAgo }
    })

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
          totalValue: valueResult[0]?.totalValue || 0,
          totalUnits: valueResult[0]?.totalUnits || 0
        },
        recentActivity: {
          last7Days: recentChanges,
          increases: recentIncreases,
          decreases: recentDecreases
        }
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getDeadStock = async (req, res) => {
  try {
    const sellerId = req.auth.userId
    const days = parseInt(req.query.days, 10) || 20

    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    const sellerProductIds = await getSellerProductIds(sellerId)

    const recentlyChangedProducts = await StockHistory.distinct('productId', {
      productId: { $in: sellerProductIds },
      createdAt: { $gte: dateThreshold }
    })

    const deadStockProducts = await Product.find({
      _id: { $in: sellerProductIds, $nin: recentlyChangedProducts },
      stock: { $gt: 0 }
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: 1 })

    const deadStockValue = deadStockProducts.reduce(
      (sum, product) => sum + product.price * product.stock,
      0
    )

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        count: deadStockProducts.length,
        totalValue: deadStockValue,
        products: deadStockProducts
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
