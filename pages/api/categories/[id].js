import dbConnect from "@/db/connect";
import Category from "@/db/models/Category";
import Transaction from "@/db/models/Transaction"; // um der ca zugehörige ta zu zählen / löschen (für ConfirmModal in FormEditCategory)
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(request, response) {
  // auth guard
  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    return response.status(401).json({ error: "Not authenticated" });
  }

  await dbConnect(); // DB

  const { id } = request.query; // ruft ID aus URL ab

  if (request.method === "GET") {
    try {
      const category = await Category.findById(id); // holt category anhand ID aus database

      if (!category) {
        return response.status(404).json({ error: "Category not found" });
      }

      /****************** für Fall A / B: ConfirmModal in FormEditCategory  **************************************************/
      const transactionCount = await Transaction.countDocuments({
        category: id,
      }); // zählt, wie viele ta diese ca referenzieren

      response.status(200).json({
        ...category.toObject(), // wandelt mongoose-doc in plain object um, um Felder ergänzen zu können
        transactionCount,
      }); // hängt Anzahl ta an, um Fall A (leere ca löschen) / B (ca + zugehörige ta löschen) im Frontend safe zu entscheiden
      /***********************************************************************************************************************/
    } catch (error) {
      response.status(500).json({ error: "Failed to fetch category" });
    }
  } else if (request.method === "PUT") {
    try {
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        request.body,
        { new: true } // geupdatete Version der category zurück
      );

      if (!updatedCategory) {
        return response.status(404).json({ error: "Category not found" });
      }

      response.status(200).json(updatedCategory);
    } catch (error) {
      response.status(500).json({ error: "Failed to update category" });
    }
  } else if (request.method === "DELETE") {
    try {
      /****************** für Fall A / B: ConfirmModal in FormEditCategory  **************************************************/
      const { cascade } = request.query; // liest optionalen query-Parameter cascade aus (zB ?cascade=true)
      const shouldCascade = cascade === "true"; // true nur dann, wenn "true" als string übergeben wurde

      if (shouldCascade) {
        await Transaction.deleteMany({ category: id }); // löscht alle ta, die zu löschende ca referenzieren (Fall B)
      }
      /***********************************************************************************************************************/

      const deletedCategory = await Category.findByIdAndDelete(id); // löscht ca (Fall A + B)

      if (!deletedCategory) {
        return response.status(404).json({ error: "Category not found" });
      }

      response.status(204).end();
    } catch (error) {
      response.status(500).json({ error: "Failed to delete category" });
    }
  } else {
    return response.status(405).json({ message: "Method not allowed" });
  }
}
