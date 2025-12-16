import express from "express";
import { verifySeller } from "../middlewares/verifySeller.js";
import upload from "../middlewares/upload.js";
import { getAllProducts, getProductByID } from "../controllers/publicProducts.controller.js";
import { addProduct, bulkDeleteProducts, deleteProduct, getSellerProductByID, getSellerProducts, updateProduct, updateStock } from "../controllers/sellerProducts.controller.js";
import { validateBody } from '../middlewares/validateBody.js'
import { productSchema, updateProductSchema } from "../utils/JoiValidation.js";
const router = express.Router();

// Protected ADMIN routes 
router.get("/seller", verifySeller, getSellerProducts);
router.get("/seller/product/:id", verifySeller, getSellerProductByID); //not used

router.post("/", verifySeller,upload.single("image"),validateBody(productSchema),addProduct);


router.put("/:id", verifySeller,upload.single("image"),validateBody(updateProductSchema),updateProduct);
router.patch("/:id/stock",verifySeller,updateStock)


router.delete("/:id", verifySeller, deleteProduct);
router.post("/seller/bulk-delete",verifySeller,bulkDeleteProducts)

// Public route 
router.get("/", getAllProducts);
router.get("/product/:id", getProductByID);

export default router;