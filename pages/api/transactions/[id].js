import dbConnect from "@/db/connect";
import Transaction from "@/db/models/Transaction";
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
      const transaction = await Transaction.findById(id).populate("category"); // holt transaction anhand ID aus database + `populate` für details der entspr. category

      if (!transaction) {
        return response.status(404).json({ error: "Transaction not found" });
      }

      response.status(200).json(transaction);
    } catch (error) {
      response.status(500).json({ error: "Failed to fetch transaction" });
    }
  } else if (request.method === "PUT") {
    try {
      const updatedTransaction = await Transaction.findByIdAndUpdate(
        id,
        request.body,
        { new: true } // geupdatete Version der transaction zurück
      ).populate("category");

      if (!updatedTransaction) {
        return response.status(404).json({ error: "Transaction not found" });
      }

      response.status(200).json(updatedTransaction);
    } catch (error) {
      response.status(500).json({ error: "Failed to update transaction" });
    }
  } else if (request.method === "DELETE") {
    try {
      const deletedTransaction = await Transaction.findByIdAndDelete(id);

      if (!deletedTransaction) {
        return response.status(404).json({ error: "Transaction not found" });
      }

      response.status(204).end();
    } catch (error) {
      response.status(500).json({ error: "Failed to delete transaction" });
    }
  } else {
    return response.status(405).json({ message: "Method not allowed" });
  }
}
