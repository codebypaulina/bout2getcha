import mongoose from "mongoose";
import dbConnect from "@/db/connect";
import Transaction from "@/db/models/Transaction";
import Category from "@/db/models/Category";
import { getAuthenticatedDbUserId } from "@/utils/apiAuth";

export default async function handler(request, response) {
  // *** [ method guard ]
  if (!["GET", "POST"].includes(request.method)) {
    return response.status(405).json({ error: "Method not allowed" });
  }

  // *** [ auth + user ]
  const dbUserId = await getAuthenticatedDbUserId(request, response);
  if (!dbUserId) return;

  // *** [ db ]
  await dbConnect();

  // *** [ GET ] **********************************************************
  if (request.method === "GET") {
    try {
      const transactions = await Transaction.find({
        userId: dbUserId, // ownership-check
      }).populate("category"); // transactions mit category-object

      return response.status(200).json(transactions);
    } catch (error) {
      return response
        .status(500)
        .json({ error: "Failed to fetch transactions" });
    }
  }

  // *** [ POST ] *********************************************************
  if (request.method === "POST") {
    try {
      const { category: categoryId, description, amount, date } = request.body; // nur diese übernehmen

      // *** [ category ]
      if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return response.status(400).json({ error: "Invalid category" });
      } // abbrechen, wenn id fehlt / ungültig

      const categoryExists = await Category.exists({
        _id: categoryId,
        userId: dbUserId,
      }); // ownership-check
      if (!categoryExists) {
        return response.status(400).json({ error: "Invalid category" });
      } // abbrechen, wenn id nicht existiert / nicht von user

      // *** [ transaction ]
      const createdTransaction = await Transaction.create({
        userId: dbUserId,
        category: categoryId,
        description,
        amount,
        date,
      }); // in db erstellen + speichern (mit category-id)

      await createdTransaction.populate("category"); // category-id -> category-object

      return response.status(201).json(createdTransaction); // zurückgeben (mit category-object)
    } catch (error) {
      if (error.name === "ValidationError") {
        return response.status(400).json({ error: "Invalid transaction data" });
      } // ungültige Eingabe (description/amount/date)

      return response
        .status(500)
        .json({ error: "Failed to create transaction" }); // alle anderen Fehler
    }
  }
}
