import mongoose from "mongoose";

export async function initMongo() {
    await mongoose.connect('mongodb+srv://saxenay117_db_user:nsmAe0GOf7nBemTc@cluster0.tlyjkaz.mongodb.net/?appName=Cluster0')
    console.log('mongo connected')
}