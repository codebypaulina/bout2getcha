import mongoose from "mongoose";
import { TX_DESCRIPTION_MAX_LENGTH } from "@/utils/constants";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category", // referenziert Category-Model
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: TX_DESCRIPTION_MAX_LENGTH,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },

  { timestamps: true } // "createdAt" + "updatedAt"
);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

export default Transaction;
