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
      type: Schema.Types.ObjectId, // category = ObjectId, das auf ein Dokument im Category-Modell verweist
      ref: "Category", // stellt sicher, dass es sich auf das Category-Modell bezieht
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

  // fügt Felder "createdAt" & "updatedAt" hinzu, um zu verfolgen, wann eine Transaktion erstellt / geändert wird
  { timestamps: true }
);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

export default Transaction;
