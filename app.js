import dotenv from 'dotenv';
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();
import express from 'express';
import http from "http";
import { Server } from "socket.io";
import connectDB from './database/mongodb.js';
import cors from 'cors';
import helmet from 'helmet';
import productrouter from './routes/products.routes.js';
import sellerAuthRouter from './routes/sellerAuth.routes.js';
import userAuthRouter from './routes/userAuth.routes.js'
import cookieParser from 'cookie-parser';
import cartRouter from './routes/cart.routes.js';
import orderRouter from './routes/order.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import superAdminRouter from './routes/superAdmin.routes.js';
import chatRouter from './routes/chat.routes.js';
import { initializeSocketHandlers } from './utils/socketHandler.js';



const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"]
    },
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// if (process.env.NODE_ENV !== "production") {
  // app.use(cors());
  app.use(cors({
    origin: ["http://localhost:5173", "http://192.168.18.22:5173"],
    credentials: true,
  }));
// }

app.use('/api/products', productrouter);
app.use('/api/seller/auth', sellerAuthRouter);
app.use('/api/user/auth',userAuthRouter)
app.use('/api/cart',cartRouter)
app.use('/api/order',orderRouter)
app.use('/api/inventory',inventoryRouter)
app.use('/api/superadmin',superAdminRouter)
app.use('/api/chat',chatRouter)

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

    // Wrap Express app in HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: ["http://localhost:5173", "http://192.168.18.22:5173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Initialize chat socket handlers
    initializeSocketHandlers(io);

    // Start HTTP server (not app.listen)
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed", err);
  }
};

startServer();



