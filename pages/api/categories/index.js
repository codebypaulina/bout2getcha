import dbConnect from "@/db/connect";
import Category from "@/db/models/Category";
import { getAuthenticatedDbUserId } from "@/utils/apiAuth";

export default async function handler(request, response) {
  // *** [ method guard ]
  if (!["GET", "POST"].includes(request.method)) {
    return response.status(405).json({ message: "Method not allowed" });
  }

  // *** [ auth + user ]
  const dbUserId = await getAuthenticatedDbUserId(request, response);
  if (!dbUserId) return;

  // *** [ db ]
  await dbConnect();

  // *** [ GET ] **********************************************************
  if (request.method === "GET") {
    try {
      const categories = await Category.find({ userId: dbUserId }); // ownership-check

      return response.status(200).json(categories);
    } catch (error) {
      return response.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  // *** [ POST ] *********************************************************
  if (request.method === "POST") {
    try {
      const { name, type, color } = request.body; // nur diese übernehmen

      const createdCategory = await Category.create({
        userId: dbUserId,
        name,
        type,
        color,
      }); // erstellen + in db speichern

      return response.status(201).json(createdCategory);
    } catch (error) {
      if (error.name === "ValidationError") {
        return response.status(400).json({ error: "Invalid category data" });
      } // ungültige Eingabe (name/type/color)

      return response.status(500).json({ error: "Failed to create category" }); // alle anderen Fehler
    }
  }
}
