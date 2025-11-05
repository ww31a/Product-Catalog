import { Router } from "express";
import { addProduct, deleteProduct, getAllProducts, getProductByID, updateProduct } from "../controllers/products.controller.js";
import upload from '../middlewares/upload.js'

const productrouter = Router();

productrouter.get('/', getAllProducts)
productrouter.get('/:id',getProductByID)
productrouter.post('/', upload.single("image"),addProduct )
productrouter.put('/:id',updateProduct)
productrouter.delete('/:id', deleteProduct)

export default productrouter;