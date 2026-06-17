import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function getAuthenticatedDbUserId(request, response) {
  // *** [ auth guard ]
  const authSession = await getServerSession(request, response, authOptions); // session aus NextAuth prüfen

  if (!authSession) {
    response.status(401).json({ error: "Not authenticated" });
    return null;
  } // abbrechen, wenn user nicht eingeloggt

  // *** [ user validation ]
  const authUserId = authSession.user.userId; // NextAuth-user-id (string)

  if (!mongoose.Types.ObjectId.isValid(authUserId)) {
    response.status(400).json({ error: "Invalid user id" });
    return null;
  } // abbrechen, wenn id ungültig

  return mongoose.Types.ObjectId.createFromHexString(authUserId); // string -> ObjectId für MongoDB
}
