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

  const { id: transactionId } = request.query; // id aus url
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    return response.status(400).json({ error: "Invalid transaction id" });
  } // abbrechen, wenn ungültig

  // *** [ GET ] **********************************************************
  if (request.method === "GET") {
    try {
      const transaction = await Transaction.findOne({
        _id: transactionId,
        userId: dbUserId, // ownership-check
      }).populate("category"); // transaction mit category-object

      if (!transaction) {
        return response.status(404).json({ error: "Transaction not found" });
      } // abbrechen, wenn nicht existiert / nicht von user

      return response.status(200).json(transaction);
    } catch (error) {
      return response
        .status(500)
        .json({ error: "Failed to fetch transaction" });
    }
  }

  // *** [ PUT ] **********************************************************
  if (request.method === "PUT") {
    try {
      // *** [ category ]: falls geändert wird
      const { category: categoryId } = request.body; // als id

      if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
          return response.status(400).json({ error: "Invalid category" });
        } // abbrechen, wenn ungültig

        const categoryExists = await Category.exists({
          _id: categoryId,
          userId: dbUserId,
        }); // ownership-check

        if (!categoryExists) {
          return response.status(400).json({ error: "Invalid category" });
        } // abbrechen, wenn id nicht existiert / nicht von user
      }

      // *** [ transaction ]
      const updatedTransaction = await Transaction.findOneAndUpdate(
        { _id: transactionId, userId: dbUserId },
        request.body,
        { new: true, runValidators: true } // geupdatete transaction
      ).populate("category"); // mit category-object

      if (!updatedTransaction) {
        return response.status(404).json({ error: "Transaction not found" });
      } // abbrechen, wenn nicht existiert / nicht von user

      return response.status(200).json(updatedTransaction);
    } catch (error) {
      return response
        .status(500)
        .json({ error: "Failed to update transaction" });
    }
  }

  // *** [ DELETE ] *******************************************************
  if (request.method === "DELETE") {
    try {
      const deletedTransaction = await Transaction.findOneAndDelete({
        _id: transactionId,
        userId: dbUserId,
      });

      if (!deletedTransaction) {
        return response.status(404).json({ error: "Transaction not found" });
      }

      return response.status(204).end();
    } catch (error) {
      return response
        .status(500)
        .json({ error: "Failed to delete transaction" });
    }
  }

  // *** [ fallback ] *****************************************************
  return response.status(405).json({ message: "Method not allowed" });
}
