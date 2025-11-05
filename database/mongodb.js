import mongoose from "mongoose";


const connectDB = async () => {

    const MONGODB_URI = process.env.MONGODB_URI
    
    mongoose.connect(MONGODB_URI).then(() => {
        console.log('Database Connected')
    })
}


export default connectDB;