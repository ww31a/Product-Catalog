import express from "express";
import { verifyAdmin } from "../middlewares/verifyadmin.js";
import upload from "../middlewares/upload.js";
import { getAllProducts, getProductByID } from "../controllers/publicProducts.controller.js";
import { addProduct, deleteProduct, getAdminProductByID, getAdminProducts, updateProduct } from "../controllers/adminProducts.controller.js";
import { validateBody } from '../middlewares/validateBody.js'
import { productSchema } from "../utils/JoiValidation.js";
const router = express.Router();

// Protected ADMIN routes 
router.get("/admin", verifyAdmin, getAdminProducts);
router.get("/admin/product/:id", verifyAdmin, getAdminProductByID);

router.post("/", verifyAdmin,upload.single("image"),validateBody(productSchema),addProduct);


router.post("/:id", verifyAdmin,upload.single("image"),validateBody(productSchema),updateProduct);


router.delete("/:id", verifyAdmin, deleteProduct);

// Public route 
router.get("/", getAllProducts);
router.get("/product/:id", getProductByID);

export default router;