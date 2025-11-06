import dotenv from 'dotenv'
dotenv.config();
import express, { urlencoded } from 'express'
import connectDB from './database/mongodb.js';
import cors from 'cors'
import productrouter from './routes/products.routes.js';
import authrouter from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';


await connectDB();

const app = express()
const PORT = 5000

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors({
    origin: true,
    credentials: true,
}));

app.use('/api/products', productrouter)
app.use('/api/admin/auth', authrouter)


app.get('/', (req, res) => {
    res.send('Hello World!')
})


app.listen(PORT,"0.0.0.0", () => {
    console.log(`Product Catalog backend running on http://0.0.0.0:${PORT}`)
})