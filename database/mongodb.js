import mongoose from "mongoose";


const connectDB = async () => {

    const MONGODB_URI = 'mongodb+srv://waqas:yQVfIsp3sQxsciB7@cluster0.c1otysg.mongodb.net/ProductCatalog?appName=Cluster0'
    
    mongoose.connect(MONGODB_URI).then(() => {
        console.log('Database Connected')
    })
}


export default connectDB;