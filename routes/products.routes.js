import express from "express";
import upload from "../middlewares/upload.js";
import { getAllProducts, getProductByID } from "../controllers/publicProducts.controller.js";
import { addProduct, bulkDeleteProducts, deleteProduct, getSellerProductByID, getSellerProducts, updateProduct, updateStock } from "../controllers/sellerProducts.controller.js";
import { validateBody } from '../middlewares/validateBody.js'
import { productSchema, updateProductSchema } from "../utils/JoiValidation.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
const router = express.Router();

// Protected ADMIN routes 
router.get("/seller", verifyAuth, authorizeRoles("seller"), getSellerProducts);
router.get("/seller/product/:id", verifyAuth, authorizeRoles("seller"), getSellerProductByID); //not used

router.post("/", verifyAuth, authorizeRoles("seller"),upload.single("image"),validateBody(productSchema),addProduct);


router.put("/:id", verifyAuth, authorizeRoles("seller"),upload.single("image"),validateBody(updateProductSchema),updateProduct);
router.patch("/:id/stock",verifyAuth, authorizeRoles("seller"),updateStock)


router.delete("/:id", verifyAuth, authorizeRoles("seller"), deleteProduct);
router.post("/seller/bulk-delete",verifyAuth, authorizeRoles("seller"),bulkDeleteProducts)

// Public route 
router.get("/", getAllProducts);
router.get("/product/:id", getProductByID);

export default router;