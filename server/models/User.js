import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:             { type: String, required: true },
    email:            { type: String, required: true, unique: true },
    password:         { type: String, required: true },
    role:             { type: String, enum: ['admin', 'employee'], required: true },
    profileImage:     { type: String },
    isFirstLogin:     { type: Boolean, default: true },   // true until they change password
    mustChangePassword: { type: Boolean, default: true }, // forced password change on first login
    createdAt:        { type: Date, default: Date.now },
    updatedAt:        { type: Date, default: Date.now },
})

const User = mongoose.model('User', userSchema);
export default User;
