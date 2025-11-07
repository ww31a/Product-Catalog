import express from "express";
import { verifyAuthentication } from "../middlewares/verifyadmin.js";
import upload from "../middlewares/upload.js";
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  getProductByID,
  updateProduct,
} from "../controllers/products.controller.js";

const router = express.Router();

// Public routes
router.get("/", getAllProducts);
router.get("/:id", getProductByID);

// Protected routes
router.post("/", verifyAuthentication, (req, res) => {
  upload.single("image")(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    addProduct(req, res);
  });
});

router.put("/:id", verifyAuthentication, (req, res) => {
  upload.single("image")(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    updateProduct(req, res);
  });
});

router.delete("/:id", verifyAuthentication, deleteProduct);

export default router;
