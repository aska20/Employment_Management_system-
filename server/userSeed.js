import 'dotenv/config'
import User from "./models/User.js"
import bcrypt from "bcrypt"
import connectToDatabase from "./db/db.js"

const userRegister = async () => {
    await connectToDatabase();
    try {
        const hashPassword = await bcrypt.hash("admin", 10);
        const user = new User({
            name: "Admin",
            email: "admin@gmail.com",
            password: hashPassword,
            role: "admin"
        });
        await user.save();
        console.log("Admin user created!");
    } catch (error) {
        console.log(error);
    } finally {
        process.exit(0);
    }
}

userRegister();