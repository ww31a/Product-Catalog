import dotenv from 'dotenv';
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();
import express from 'express';
import connectDB from './database/mongodb.js';
import cors from 'cors';
// import helmet from 'helmet';
import { setupSwagger } from './swagger.js';
import productrouter from './routes/products.routes.js';
import sellerAuthRouter from './routes/sellerAuth.routes.js';
import userAuthRouter from './routes/userAuth.routes.js'
import cookieParser from 'cookie-parser';
import cartRouter from './routes/cart.routes.js';
import orderRouter from './routes/order.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import superAdminRouter from './routes/superAdmin.routes.js';


const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Comment out Helmet completely for testing
// app.use(helmet({ ... }));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: ["http://localhost:5173", "http://192.168.18.22:5173"],
  credentials: true,
}));

setupSwagger(app);

app.use('/api/products', productrouter);
app.use('/api/seller/auth', sellerAuthRouter);
app.use('/api/user/auth',userAuthRouter)
app.use('/api/cart',cartRouter)
app.use('/api/order',orderRouter)
app.use('/api/inventory',inventoryRouter)
app.use('/api/superadmin',superAdminRouter)

// Serve React frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = join(__dirname, "frontend", "dist");
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}


const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger docs at http://192.168.18.23:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("Startup failed", err);
  }
};

startServer();