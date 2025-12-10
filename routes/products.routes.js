import express from "express";
import { verifyAdmin } from "../middlewares/verifyadmin.js";
import upload from "../middlewares/upload.js";
import { getAllProducts, getProductByID } from "../controllers/publicProducts.controller.js";
import { addProduct, bulkDeleteProducts, deleteProduct, getAdminProductByID, getAdminProducts, updateProduct, updateStock } from "../controllers/adminProducts.controller.js";
import { validateBody } from '../middlewares/validateBody.js'
import { productSchema, updateProductSchema } from "../utils/JoiValidation.js";
const router = express.Router();

// Protected ADMIN routes 
router.get("/admin", verifyAdmin, getAdminProducts);
router.get("/admin/product/:id", verifyAdmin, getAdminProductByID);

router.post("/", verifyAdmin,upload.single("image"),validateBody(productSchema),addProduct);


router.put("/:id", verifyAdmin,upload.single("image"),validateBody(updateProductSchema),updateProduct);
router.patch("/:id/stock",verifyAdmin,updateStock)


router.delete("/:id", verifyAdmin, deleteProduct);
router.post("/admin/bulk-delete",verifyAdmin,bulkDeleteProducts)

// Public route 
router.get("/", getAllProducts);
router.get("/product/:id", getProductByID);

export default router;