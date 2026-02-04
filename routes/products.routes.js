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
router.get("/seller", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getSellerProducts);
router.get("/seller/product/:id", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getSellerProductByID); //not used

router.post("/", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), upload.single("image"), withLogging('Validation', validateBody(productSchema)), addProduct);


router.put("/:id", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), upload.single("image"), withLogging('Validation', validateBody(updateProductSchema)), updateProduct);
router.patch("/:id/stock", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), updateStock)


router.delete("/:id", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), deleteProduct);
router.post("/seller/bulk-delete", withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), bulkDeleteProducts)

// Public route 
router.get("/", getAllProducts);
router.get("/product/:id", getProductByID);

export default router;