import { Router } from "express";
import { 
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controllers/category.controller.js";


import { verifyAdmin } from "../middlewares/verifyadmin.js";
const router = Router();

// Admin protected
router.post("/", verifyAdmin,createCategory);
router.put("/:id", verifyAdmin, updateCategory);
router.delete("/:id", verifyAdmin, deleteCategory);

// Public / Admin
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

export default router;
