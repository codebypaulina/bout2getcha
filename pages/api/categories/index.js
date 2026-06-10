import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/db/connect";
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
      const categories = await Category.find({ userId: dbUserId }); // ownership-check

      return response.status(200).json(categories);
    } catch (error) {
      return response.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  // *** [ POST ] *********************************************************
  if (request.method === "POST") {
    try {
      const createdCategory = await Category.create({
        ...request.body,
        userId: dbUserId,
      }); // erstellen + in db speichern

      return response.status(201).json(createdCategory);
    } catch (error) {
      if (error.name === "ValidationError") {
        return response.status(400).json({ error: "Invalid category data" });
      } // ungültige Eingabe (name/type/color)

      return response.status(500).json({ error: "Failed to create category" }); // alle anderen Fehler
    }
  }

  // *** [ fallback ] *****************************************************
  return response.status(405).json({ message: "Method not allowed" });
}
