import express from "express";
import upload from "../middlewares/upload.js";
import { getAllProducts, getProductByID } from "../controllers/publicProducts.controller.js";
import { addProduct, bulkDeleteProducts, deleteProduct, getSellerProductByID, getSellerProducts, updateProduct, updateStock } from "../controllers/sellerProducts.controller.js";
import { validateBody } from '../middlewares/validateBody.js'
import { productSchema, updateProductSchema } from "../utils/JoiValidation.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { withLogging } from "../middlewares/withLogging.js";

const router = express.Router();

// Protected ADMIN routes 
router.get("/seller", verifyAuth, authorizeRoles("seller"), withLogging('SELLER_LIST_MY_PRODUCTS', getSellerProducts));
router.get("/seller/product/:id", verifyAuth, authorizeRoles("seller"), withLogging('SELLER_VIEW_PRODUCT', getSellerProductByID)); //not used

router.post("/", verifyAuth, authorizeRoles("seller"), upload.single("image"), validateBody(productSchema), withLogging('SELLER_ADD_PRODUCT', addProduct));


router.put("/:id", verifyAuth, authorizeRoles("seller"), upload.single("image"), validateBody(updateProductSchema), withLogging('SELLER_UPDATE_PRODUCT', updateProduct));
router.patch("/:id/stock", verifyAuth, authorizeRoles("seller"), withLogging('SELLER_UPDATE_STOCK', updateStock))


router.delete("/:id", verifyAuth, authorizeRoles("seller"), withLogging('SELLER_DELETE_PRODUCT', deleteProduct));
router.post("/seller/bulk-delete", verifyAuth, authorizeRoles("seller"), withLogging('SELLER_BULK_DELETE_PRODUCTS', bulkDeleteProducts))

// Public route 
router.get("/", withLogging('LIST_PRODUCTS_PUBLIC', getAllProducts));
router.get("/product/:id", withLogging('VIEW_PRODUCT_PUBLIC', getProductByID));

export default router;