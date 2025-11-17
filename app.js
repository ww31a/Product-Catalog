import dotenv from 'dotenv';
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();
import express from 'express';
import connectDB from './database/mongodb.js';
import cors from 'cors';
import helmet from 'helmet';
import productrouter from './routes/products.routes.js';
import adminAuthRouter from './routes/adminAuth.routes.js';
import userAuthRouter from './routes/userAuth.routes.js'
import cookieParser from 'cookie-parser';

await connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  // app.use(cors());
  app.use(cors({
    origin: ["http://localhost:5173", "http://192.168.18.22:5173"],
    credentials: true,
  }));
}

app.use('/api/products', productrouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/user/auth',userAuthRouter)

if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "frontend", "dist")));
  
  app.all("*", (req, res) => {
    res.sendFile(join(__dirname, "frontend", "dist", "index.html"));
  });
}
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Product Catalog backend running on http://0.0.0.0:${PORT}`);
});
