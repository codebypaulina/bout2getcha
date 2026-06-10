import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/db/connect";
import Category from "@/db/models/Category";
import Transaction from "@/db/models/Transaction";

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

  const { id: categoryId } = request.query; // id aus url
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return response.status(400).json({ error: "Invalid category id" });
  } // abbrechen, wenn ungültig

  // *** [ GET ] **********************************************************
  if (request.method === "GET") {
    try {
      const category = await Category.findOne({
        _id: categoryId,
        userId: dbUserId,
      }); // ownership-check

      if (!category) {
        return response.status(404).json({ error: "Category not found" });
      } // abbrechen, wenn nicht existiert / nicht von user

      // *** für cascade delete (CategoryDetailsPage)
      const transactionCount = await Transaction.countDocuments({
        category: categoryId,
        userId: dbUserId,
      }); // Anzahl transactions in category von user

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
        { _id: categoryId, userId: dbUserId },
        request.body,
        { new: true, runValidators: true } // geupdatete category
      );

      if (!updatedCategory) {
        return response.status(404).json({ error: "Category not found" });
      } // abbrechen, wenn nicht existiert / nicht von user

      return response.status(200).json(updatedCategory);
    } catch (error) {
      if (error.name === "ValidationError") {
        return response.status(400).json({ error: "Invalid category data" });
      } // ungültige Eingabe (name/type/color)

      return response.status(500).json({ error: "Failed to update category" }); // alle anderen Fehler
    }
  }

  // *** [ DELETE ] *******************************************************
  if (request.method === "DELETE") {
    // MongoDB-Session (für Transaction)
    const dbSession = await mongoose.startSession();

    try {
      // *** [ MongoDB-Transaction ] ***********************\
      await dbSession.withTransaction(async () => {
        // *** [ 1. ownership-check ] *************
        const category = await Category.findOne({
          _id: categoryId,
          userId: dbUserId,
        }).session(dbSession);

        if (!category) {
          throw new Error("CATEGORY_NOT_FOUND");
        } // abbrechen, wenn nicht existiert / nicht von user

        // *** [ 2. cascade delete ] **************
        const { cascade } = request.query; // aus url (CategoryDetailsPage)

        if (cascade === "true") {
          await Transaction.deleteMany({
            category: categoryId,
            userId: dbUserId,
          }).session(dbSession);
        } // enthaltene transaction(s) löschen

        // *** [ 3. category delete ] *************
        await Category.findOneAndDelete({
          _id: categoryId,
          userId: dbUserId,
        }).session(dbSession);
      });
      // ***************************************************/

      return response.status(204).end();
    } catch (error) {
      if (error.message === "CATEGORY_NOT_FOUND") {
        return response.status(404).json({ error: "Category not found" });
      }

      return response.status(500).json({ error: "Failed to delete category" });
    } finally {
      await dbSession.endSession();
    }
  }

  // *** [ fallback ] *****************************************************
  return response.status(405).json({ message: "Method not allowed" });
}
