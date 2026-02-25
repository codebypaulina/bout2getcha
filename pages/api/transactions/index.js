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

  if (request.method === "GET") {
    try {
      const transactions = await Transaction.find().populate("category"); // holt alle Transaktionen aus database + `populate` für Details der entspr. Kategorie

      response.status(200).json(transactions);
    } catch (error) {
      response.status(500).json({ error: "Failed to fetch transactions" });
    }
  } else if (request.method === "POST") {
    try {
      const newTransaction = new Transaction(request.body); // erstellt neue Transaktion
      const savedTransaction = await newTransaction.save(); // speichert neue Transaktion in database

      response.status(201).json(savedTransaction);
    } catch (error) {
      response.status(500).json({ error: "Failed to create transaction" });
    }
  } else {
    return response.status(405).json({ message: "Method not allowed" });
  }
}
