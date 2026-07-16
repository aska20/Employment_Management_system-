import mongoose from "mongoose";
const { Schema } = mongoose;

const holidaySchema = new Schema({
    name:        { type: String, required: true },
    date:        { type: String, required: true },  // "YYYY-MM-DD"
    description: { type: String, default: '' },
    declaredBy:  { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt:   { type: Date, default: Date.now }
});

holidaySchema.index({ date: 1 }, { unique: true });

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
