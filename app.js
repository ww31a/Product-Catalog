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
import cartRouter from './routes/cart.routes.js';
import orderRouter from './routes/order.routes.js';



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
app.use('/api/cart',cartRouter)
app.use('/api/order',orderRouter)

// Serve React frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = join(__dirname, "frontend", "dist");
  app.use(express.static(distPath));

  // Send index.html for all unknown routes
  app.get("*", (req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}


const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on ${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed", err);
  }
};

startServer();


