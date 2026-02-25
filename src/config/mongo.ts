import mongoose from "mongoose";

export async function initMongo() {
    await mongoose.connect(process.env.MONGODB)
    console.log('mongo connected')
}