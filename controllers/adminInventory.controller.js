import Product from '../models/products.module.js'
import stockHistory from '../models/stockHistory.module.js'
import Order from '../models/order.module.js'
import mongoose from 'mongoose'

/**
 * Helper to get product IDs owned by the admin
 */
const getAdminProductIds = async (adminId) => {
  const products = await Product.find({ owner: adminId }).select('_id')
  return products.map(p => p._id)
}

/**
 * Get Best Selling Products for logged-in admin
 */
export const getBestSellingProducts = async (req, res) => {
  try {
    const adminId = req.user.id
    const days = parseInt(req.query.days) || 30
    const limit = parseInt(req.query.limit) || 10
    
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    const adminProductIds = await getAdminProductIds(adminId)

    // Aggregate sales from delivered orders only
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
          'items._id': { $in: adminProductIds.map(id => id.toString()) }
        }
      },
      {
        $group: {
          _id: '$items._id',
          totalSold: { $sum: '$items.quantity' },
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ])

    const productIds = bestSellers.map(item => item._id)
    
    const products = await Product.find({ _id: { $in: productIds }, owner: adminId })
      .select('title brand price stock image')

    // ✅ Keep nested structure with "product" key
    const result = bestSellers.map(seller => {
      const product = products.find(p => p._id.toString() === seller._id.toString())
      return {
        product: {
          _id: product?._id,
          title: product?.title,
          brand: product?.brand,
          price: product?.price,
          stock: product?.stock,
          image: product?.image
        },
        totalSold: seller.totalSold,
        salesCount: seller.salesCount,
        revenue: seller.totalRevenue
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
/**
 * Low Stock Alert
 */
export const getLowStockAlert = async (req,res) => {
  try {
    const adminId = req.user.id
    const threshold = 5

    const products = await Product.find({
      owner: adminId,
      stock: { $gt: 0, $lte: threshold }
    }).populate('owner','name email').sort({stock:1})

    res.json({ success: true, data: { threshold, count: products.length, products } })
  } catch(err) {
    res.status(500).json({ success:false, message: err.message })
  }
}

/**
 * Out Of Stock Alert
 */
export const getOutOfStockAlert = async (req,res) => {
  try {
    const adminId = req.user.id

    const products = await Product.find({ owner: adminId, stock: 0 })
      .populate('owner','name email')
      .sort({ updatedAt: -1 })

    res.json({ success:true, data: { count: products.length, products } })
  } catch(err) {
    res.status(500).json({ success:false, message: err.message })
  }
}

/**
 * In Stock Alert
 */
export const getInStockAlert = async (req, res) => {
  try {
    const adminId = req.user.id
    const threshold = 5

    const products = await Product.find({ owner: adminId, stock: { $gt: threshold } })
      .populate('owner','name email')
      .sort({ stock: -1 })

    res.json({ success: true, data: { threshold, count: products.length, products } })
  } catch (error) {
    res.status(500).json({ success:false, message: error.message })
  }
}

/**
 * Stock Summary
 */
export const getStockSummary = async (req, res) => {
  try {
    const adminId = req.user.id
    const threshold = 5

    const totalProducts = await Product.countDocuments({ owner: adminId })
    const outOfStock = await Product.countDocuments({ owner: adminId, stock: 0 })
    const lowStock = await Product.countDocuments({ owner: adminId, stock: { $gt: 0, $lte: threshold } })
    const inStock = await Product.countDocuments({ owner: adminId, stock: { $gt: threshold } })

    const valueResult = await Product.aggregate([
      { $match: { owner: adminId } },
      { $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
          totalUnits: { $sum: "$stock" }
        } 
      }
    ])

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const adminProductIds = await getAdminProductIds(adminId)

    const recentChanges = await stockHistory.countDocuments({ productId: { $in: adminProductIds }, createdAt: { $gte: sevenDaysAgo } })
    const recentIncreases = await stockHistory.countDocuments({ productId: { $in: adminProductIds }, type: 'add', createdAt: { $gte: sevenDaysAgo } })
    const recentDecreases = await stockHistory.countDocuments({ productId: { $in: adminProductIds }, type: 'remove', createdAt: { $gte: sevenDaysAgo } })

    res.json({
      success:true,
      data:{
        stockStatus: { totalProducts, inStock, lowStock, outOfStock },
        inventoryValue: { totalValue: valueResult[0]?.totalValue || 0, totalUnits: valueResult[0]?.totalUnits || 0 },
        recentActivity: { last7Days: recentChanges, increases: recentIncreases, decreases: recentDecreases }
      }
    })

  } catch(error) {
    res.status(500).json({ success:false, message:error.message })
  }
}

/**
 * Dead Stock (no stock changes in X days)
 */
export const getDeadStock = async (req,res) => {
  try {
    const adminId = req.user.id
    const days = parseInt(req.query.days) || 20
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    const adminProductIds = await getAdminProductIds(adminId)

    const recentlyChangedProducts = await stockHistory.distinct('productId', {
      productId: { $in: adminProductIds },
      createdAt: { $gte: dateThreshold }
    })

    const deadStockProducts = await Product.find({
      _id: { $in: adminProductIds, $nin: recentlyChangedProducts },
      stock: { $gt: 0 }
    }).populate('owner','name email').sort({ updatedAt: 1 })

    const deadStockValue = deadStockProducts.reduce((sum, product) => sum + product.price * product.stock, 0)

    res.json({ success:true, data: { period: `${days} days`, count: deadStockProducts.length, totalValue: deadStockValue, products: deadStockProducts } })

  } catch(error) {
    res.status(500).json({ success:false, message:error.message })
  }
}
