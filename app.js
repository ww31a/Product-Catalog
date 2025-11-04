import express from 'express'
// import authrouter from './routes/auth.routes';
import connectDB from './database/mongodb.js';
import upload from './middlewares/upload.js';
import cors from 'cors'
// import jwt from 'jsonwebtoken'
import Product from './models/products.module.js'


await connectDB();

const app = express()
const PORT = 5000


app.use(express.json());
app.use(cors({
    origin: "http://192.168.18.255:3000",
    credentials: true,
}));

// app.use('/api/products', productrouter)
// app.use('/api/admin/auth', authrouter)
// app.use('/api/admin/dashboard, adminrouter)

// app.post('/login', async (req,res)=>{
//     const {username, password} = req.body
//     const user = users.find(u => u.username === username)
//     if (!user || password !== user.password){
//         return res.send('Not Authorized')
//     }

//     const token = jwt.sign({username},'test#secret')
//     res.json({token})

// })

app.get('/', (req, res) => {
    res.send('Hello World!')
})


app.post('/api/products', upload.single("image"), async (req, res) => {
    try {
        const product = await Product.create({
            ...req.body,
            image: req.file
                ? {
                    data: req.file.buffer,
                    contentType: req.file.mimetype,
                }
                : undefined,
        });
        res.status(200).json(product);
    }
    catch (error) {
        res.status(500).json({ message: error.message })
    }
})


app.get('/api/products', async (req,res)=>{
    try{
        const products = await Product.find({});
        res.status(200).json(products);
    }
    catch(error){
        res.status(500).json({message:error.nessage})
    }
})

app.get('/api/product/:id', async (req,res)=>{
    try{
        const {id} = req.params;
        const product = await Product.findById(id);
        res.status(200).json(product);
    }
    catch(error){
        res.status(500).json({message:error.nessage})
    }
})

app.get('/api/product/:id', async (req,res)=>{
    try{
        const {id} = req.params;
        const product = await Product.findByIdAndUpdate(id, req.body);
        if(!product){
            return res.status(404).json({message:"Product not found"})
        }
        const updatedProduct = await Product.findbyId(id);
        res.status(200).json(updatedProduct);
    }
    catch(error){
        res.status(500).json({message:error.nessage})
    }
})

app.delete('/api/product/:id', async (req,res)=>{
    try{
        const {id} = req.params;
        const product = await Product.findByIdAndDelete(id);
        if(!product){
            return res.status(404).json({message:"Product not found"})
        }
        res.status(200).json(product);
    }
    catch(error){
        res.status(500).json({message:error.nessage})
    }
})


app.listen(PORT, () => {
    console.log(`Product Catalog backend running on http://localhost:${PORT}`)
})