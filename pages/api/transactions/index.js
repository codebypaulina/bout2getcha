import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/db/connect";
import Transaction from "@/db/models/Transaction";
import Category from "@/db/models/Category";

export default async function handler(request, response) {
  // *** [ auth guard ]
  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    return response.status(401).json({ error: "Not authenticated" });
  }

  // *** [ user / ownership ]
  const userId = session.user.userId; // aus NextAuth-session (string)

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return response.status(400).json({ error: "Invalid user id" }); // defensive check (kein crash bei ungültiger ID)
  }

  const userObjectId = mongoose.Types.ObjectId.createFromHexString(userId); // aktueller user als ObjectId (für MongoDB-Queries)

  // *** [ DB ]
  await dbConnect();

  // *** [ GET ] **********************************************************
  if (request.method === "GET") {
    try {
      const transactions = await Transaction.find({
        userId: userObjectId, // nur transactions des eingeloggten users
      }).populate("category"); // für details der entspr. category

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
      const categoryId = request.body.category;
      if (!categoryId) {
        return response.status(400).json({ error: "Category is required" });
      }

      // ownership-check (transaction darf nur in users category gespeichert werden)
      const category = await Category.findOne({
        _id: categoryId,
        userId: userObjectId,
      });
      if (!category) {
        return response.status(400).json({ error: "Invalid category" });
      }

      const newTransaction = new Transaction({
        ...request.body,
        userId: userObjectId,
      }); // neue transaction erstellen
      const savedTransaction = await newTransaction.save(); // in DB speichern

      return response.status(201).json(savedTransaction);
    } catch (error) {
      return response
        .status(500)
        .json({ error: "Failed to create transaction" });
    }
  }

  // *** [ fallback ] *****************************************************
  return response.status(405).json({ message: "Method not allowed" });
}
