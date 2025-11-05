import express, { urlencoded } from 'express'
import connectDB from './database/mongodb.js';
import cors from 'cors'
import productrouter from './routes/products.routes.js';
import authrouter from './routes/auth.routes.js';
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';
import createDefaultAdmin from './lib/defaultAdmin.js'
// import { v2 as cloudinary } from 'cloudinary';

dotenv.config();
await connectDB();

const app = express()
const PORT = 5000
// cloudinary.config({
//     cloud_name: "dfym823lc",
//     upload_preset: "webwritecatalog"
// })

// const { CloudinaryStorage } = require('multer-storage-cloudinary');
 
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: (req, file) => 'product_catalog',
//     format: async (req, file) => {
//       return 'jpeg';
//     },
//     public_id: (req, file) => file.filename + "_" + Date.now(),
//   },
// });


// const upload = multer({storage, limits:{fileSize: 5*1024*1024}})


app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors({
    origin: "http://192.168.18.255:3000",
    credentials: true,
}));

app.use('/api/products', productrouter)
app.use('/api/admin/auth', authrouter)


app.get('/', (req, res) => {
    res.send('Hello World!')
})


if (process.env.NODE_ENV !== "production") {
  createDefaultAdmin();
}


app.listen(PORT,"0.0.0.0", () => {
    console.log(`Product Catalog backend running on http://0.0.0.0:${PORT}`)
})