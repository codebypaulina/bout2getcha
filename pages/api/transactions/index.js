import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/db/connect";
import Transaction from "@/db/models/Transaction";
import Category from "@/db/models/Category";

export default async function handler(request, response) {
  // *** [ auth guard ]
  const authSession = await getServerSession(request, response, authOptions);
  if (!authSession) {
    return response.status(401).json({ error: "Not authenticated" });
  }

  // *** [ user validation ]
  const authUserId = authSession.user.userId; // NextAuth-user-id (string)
  if (!mongoose.Types.ObjectId.isValid(authUserId)) {
    return response.status(400).json({ error: "Invalid user id" }); // abbrechen, wenn id ungültig (kein crash)
  }
  const dbUserId = mongoose.Types.ObjectId.createFromHexString(authUserId); // string -> ObjectId (für MongoDB)

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
      // *** [ category ]
      const { category: categoryId } = request.body; // als id
      if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return response.status(400).json({ error: "Invalid category" });
      } // abbrechen, wenn fehlt / ungültig

      const categoryExists = await Category.exists({
        _id: categoryId,
        userId: dbUserId,
      }); // ownership-check
      if (!categoryExists) {
        return response.status(400).json({ error: "Invalid category" });
      } // abbrechen, wenn id nicht existiert / nicht von user

      // *** [ transaction ]
      const createdTransaction = await Transaction.create({
        ...request.body,
        userId: dbUserId,
      }); // in db erstellen + speichern (mit category-id)

      await createdTransaction.populate("category"); // category-id -> category-object

      return response.status(201).json(createdTransaction); // zurückgeben (mit category-object)
    } catch (error) {
      return response
        .status(500)
        .json({ error: "Failed to create transaction" });
    }
  }

  // *** [ method fallback ] **********************************************
  return response.status(405).json({ message: "Method not allowed" });
}
