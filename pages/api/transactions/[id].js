import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/db/connect";
import Transaction from "@/db/models/Transaction";

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

  const { id } = request.query; // transaction-ID aus URL

  // *** [ GET ] **********************************************************
  if (request.method === "GET") {
    try {
      const transaction = await Transaction.findOne({
        _id: id,
        userId: userObjectId, // transaction des eingeloggten users
      }).populate("category"); // für details der entspr. category

      if (!transaction) {
        return response.status(404).json({ error: "Transaction not found" });
      }

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
      const updatedTransaction = await Transaction.findOneAndUpdate(
        { _id: id, userId: userObjectId },
        request.body,
        { new: true } // geupdatete Version der transaction
      ).populate("category");

      if (!updatedTransaction) {
        return response.status(404).json({ error: "Transaction not found" });
      }

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
        _id: id,
        userId: userObjectId,
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
