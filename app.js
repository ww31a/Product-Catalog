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
import adminChatRouter from './routes/adminChat.routes.js';
import { initializeSocketHandlers } from './sockets/index.js';
import activityRouter from './routes/activity.routes.js';
import { loggingMiddleware } from './middlewares/logging.middleware.js';
import { uploadLogsCronJob } from './utils/uploadLogsToCloudinary.js';
import { logSystem, logError } from './utils/logger.js';
import meRouter from './routes/me.js';


const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Apply logging middleware FIRST
app.use(loggingMiddleware);

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "blob:", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:5173"],
      objectSrc: ["'self'", "blob:"]
    },
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: ["http://localhost:5173", "http://192.168.18.22:5173"],
  credentials: true,
}));

app.use('/api/me', meRouter);
app.use('/api/products', productrouter);
app.use('/api/seller/auth', sellerAuthRouter);
app.use('/api/user/auth', userAuthRouter)
app.use('/api/cart', cartRouter)
app.use('/api/order', orderRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/superadmin', superAdminRouter)
app.use('/api/admin/chat', adminChatRouter)
app.use('/api/chat', chatRouter)
app.use('/api/activity', activityRouter)

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
    // Log system startup attempt
    logSystem({
      event: "SERVER_START",
      message: `Server starting on port ${PORT}`,
      metadata: { port: PORT, env: process.env.NODE_ENV }
    });

    await connectDB();

    // Log DB connection success
    logSystem({
      event: "DATABASE_CONNECTED",
      message: "MongoDB connection established"
    });

    // Start cron job for log uploads
    uploadLogsCronJob();

    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: ["http://localhost:5173", "http://192.168.18.22:5173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    initializeSocketHandlers(io);

    httpServer.listen(PORT, "0.0.0.0", () => {
      logSystem({
        event: "SERVER_READY",
        message: `Server running on port ${PORT}`,
        metadata: { port: PORT }
      });
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logError({
      error: err,
      context: "Server Startup",
      metadata: { port: PORT }
    });
    console.error("Startup failed", err);
  }
};

startServer();



