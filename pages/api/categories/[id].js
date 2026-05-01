import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/db/connect";
import Category from "@/db/models/Category";
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

  const { id } = request.query; // category-ID aus URL

  // *** [ GET ] **********************************************************
  if (request.method === "GET") {
    try {
      const category = await Category.findOne({
        _id: id,
        userId: userObjectId,
      }); // category des eingeloggten users

      if (!category) {
        return response.status(404).json({ error: "Category not found" });
      }

      // *** für cascade delete (CategoryDetailsPage)
      const transactionCount = await Transaction.countDocuments({
        category: id,
        userId: userObjectId,
      }); // Anzahl transactions in category des eingeloggten users

      return response.status(200).json({
        ...category.toObject(), // mongoose-doc in plain object, um Feld zu ergänzen
        transactionCount,
      });
    } catch (error) {
      return response.status(500).json({ error: "Failed to fetch category" });
    }
  }

  // *** [ PUT ] **********************************************************
  if (request.method === "PUT") {
    try {
      const updatedCategory = await Category.findOneAndUpdate(
        { _id: id, userId: userObjectId },
        request.body,
        { new: true, runValidators: true } // geupdatete Version der category
      );

      if (!updatedCategory) {
        return response.status(404).json({ error: "Category not found" });
      }

      return response.status(200).json(updatedCategory);
    } catch (error) {
      return response.status(500).json({ error: "Failed to update category" });
    }
  }

  // *** [ DELETE ] *******************************************************
  if (request.method === "DELETE") {
    try {
      // 1. cascade delete: erst enthaltene transaction(s) löschen
      const { cascade } = request.query; // cascade aus URL (CategoryDetailsPage)

      if (cascade === "true") {
        await Transaction.deleteMany({ category: id, userId: userObjectId });
      }

      // 2. category delete
      const deletedCategory = await Category.findOneAndDelete({
        _id: id,
        userId: userObjectId,
      });

      if (!deletedCategory) {
        return response.status(404).json({ error: "Category not found" });
      }

      return response.status(204).end();
    } catch (error) {
      return response.status(500).json({ error: "Failed to delete category" });
    }
  }

  // *** [ fallback ] *****************************************************
  return response.status(405).json({ message: "Method not allowed" });
}
