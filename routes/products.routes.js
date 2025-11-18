import express from "express";
import { verifyAdmin } from "../middlewares/verifyadmin.js";
import upload from "../middlewares/upload.js";
import { getAllProducts, getProductByID } from "../controllers/publicProducts.controller.js";
import { addProduct, deleteProduct, getAdminProductByID, getAdminProducts, updateProduct } from "../controllers/adminProducts.controller.js";

const router = express.Router();

// Public route 
router.get("/", getAllProducts);

// Protected ADMIN routes 
router.get("/admin", verifyAdmin, getAdminProducts);
router.get("/admin/product/:id", verifyAdmin, getAdminProductByID); 

router.post("/", verifyAdmin, (req, res) => {
  upload.single("image")(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    addProduct(req, res);
  });
});

router.put("/:id", verifyAdmin, (req, res) => {
  upload.single("image")(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    updateProduct(req, res);
  });
});

router.delete("/:id", verifyAdmin, deleteProduct);

// Public route 
router.get("/product/:id", getProductByID);

export default router;