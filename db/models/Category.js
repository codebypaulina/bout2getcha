import mongoose from "mongoose";
import { CAT_NAME_MAX_LENGTH } from "@/utils/constants";

const { Schema } = mongoose;

const categorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: CAT_NAME_MAX_LENGTH,
  },
  type: {
    type: String,
    enum: ["Income", "Expense"], // nur "Income" / "Expense"
    required: true,
  },
  color: {
    type: String, // Hex-Code
    required: true,
  },
});

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

export default Category;
