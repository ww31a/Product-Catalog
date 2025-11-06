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

router.get("/", getAllProducts);
router.get("/:id", getProductByID);

router.post("/", verifyAuthentication, (req, res, next) => {
  upload.single("image")(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    addProduct(req, res);
  });
});

router.put("/:id", verifyAuthentication, (req, res, next) => {
  upload.single("image")(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    updateProduct(req, res);
  });
});

router.delete("/:id", verifyAuthentication, deleteProduct);

export default router;
