import mongoose from "mongoose";
import dbConnect from "@/db/connect";
import Category from "@/db/models/Category";
import Transaction from "@/db/models/Transaction";
import { getAuthenticatedDbUserId } from "@/utils/apiAuth";

export default async function handler(request, response) {
  // *** [ method guard ]
  if (!["GET", "PUT", "DELETE"].includes(request.method)) {
    return response.status(405).json({ error: "Method not allowed" });
  }

  // *** [ auth + user ]
  const dbUserId = await getAuthenticatedDbUserId(request, response);
  if (!dbUserId) return;

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
      // *** [ partial update ]
      // -> CategoryDetailsPage sendet Felder einzeln (inline-actions, nicht form)
      const fieldToUpdate = {};

      if (Object.hasOwn(request.body, "name")) {
        fieldToUpdate.name = request.body.name;
      }
      if (Object.hasOwn(request.body, "type")) {
        fieldToUpdate.type = request.body.type;
      }
      if (Object.hasOwn(request.body, "color")) {
        fieldToUpdate.color = request.body.color;
      }

      if (Object.keys(fieldToUpdate).length === 0) {
        return response.status(400).json({ error: "Invalid category data" });
      } // abbrechen, wenn leer

      // *** [ update ]
      const updatedCategory = await Category.findOneAndUpdate(
        { _id: categoryId, userId: dbUserId },
        fieldToUpdate,
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
    const dbSession = await mongoose.startSession(); // MongoDB-Session (für Transaction)

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
}
