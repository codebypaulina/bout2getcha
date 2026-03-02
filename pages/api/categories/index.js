import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/db/connect";
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
  // categories | zugehörige transactions | totalAmount
  if (request.method === "GET") {
    try {
      const categories = await Category.aggregate([
        // [categories] des eingeloggten users:
        {
          $match: { userId: userObjectId },
        },

        // [transactions] in category integrieren:
        {
          $lookup: {
            from: "transactions", // collection, aus der gejoint wird
            let: { categoryId: "$_id" }, // aktuelle category-ID für join (in pipeline "$$categoryId")
            pipeline: [
              {
                $match: {
                  // Feld-zu-Feld / Feld-zu-Variable vergleichen:
                  $expr: {
                    $and: [
                      // nur transactions mit aktueller category-ID:
                      // ($category = Feld in transactions-collection: transaction.category // $$categoryId = let-Variable ID)
                      { $eq: ["$category", "$$categoryId"] },

                      // nur transactions des eingeloggten users:
                      // ($userId = Feld in transactions-collection: transaction.userId // userObjectId = user)
                      { $eq: ["$userId", userObjectId] },
                    ],
                  },
                },
              },
            ],
            as: "transactions", // integrierte transactions (neues Feld)
          },
        },

        // [totalAmount] aus integrierten transactions:
        {
          $addFields: {
            totalAmount: { $sum: "$transactions.amount" },
          },
        },
      ]);

      return response.status(200).json(categories);
    } catch (error) {
      return response.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  // *** [ POST ] *********************************************************
  if (request.method === "POST") {
    try {
      const newCategory = new Category({
        ...request.body,
        userId: userObjectId,
      }); // neue category erstellen
      const savedCategory = await newCategory.save(); // in DB speichern

      return response.status(201).json(savedCategory);
    } catch (error) {
      return response.status(500).json({ error: "Failed to create category" });
    }
  }

  // *** [ fallback ] *****************************************************
  return response.status(405).json({ message: "Method not allowed" });
}
