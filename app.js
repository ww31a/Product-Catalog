import dotenv from 'dotenv'
dotenv.config();
import express, { urlencoded } from 'express'
import connectDB from './database/mongodb.js';
import cors from 'cors'
import productrouter from './routes/products.routes.js';
import authrouter from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';
import path from 'path'


await connectDB();

const app = express()
const PORT = 5000
const _dirname = path.resolve();
console.log(_dirname)

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "production") {
    app.use(cors({
        origin: [
            "http://localhost:5173",
            "http://192.168.18.22:5173", 
        ],
        credentials: true,
    }));
}

app.use('/api/products', productrouter)
app.use('/api/admin/auth', authrouter)

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(_dirname, "frontend/dist")))
    app.use('*', (req, res) => {
        res.sendFile(path.join(_dirname, "frontend", "dist", "index.html"))
    })
}

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Product Catalog backend running on http://0.0.0.0:${PORT}`)
})