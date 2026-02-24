import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Income", "Expense"], // stellt sicher, dass nur "Income" oder "Expense" sein kann
      // required: true,
    },
    category: {
      type: Schema.Types.ObjectId, // category = ObjectId, das auf ein Dokument im Category-Modell verweist
      ref: "Category", // stellt sicher, dass es sich auf das Category-Modell bezieht
      required: true,
    },
    description: {
      type: String,
      required: true,
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
