import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import dbConnect from "@/db/connect";
import SeedLog from "@/db/models/SeedLog";
import Category from "@/db/models/Category";
import Transaction from "@/db/models/Transaction";

export default async function handler(request, response) {
  // *** [ auth guard ]
  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    return response.status(401).json({ error: "Not authenticated" });
  }

  // *** [ user ]
  const userId = session.user.userId; // aus NextAuth-session (string)
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return response.status(400).json({ error: "Invalid user id" }); // defensive check (kein crash bei ungültiger ID)
  }
  const userObjectId = mongoose.Types.ObjectId.createFromHexString(userId); // aktueller user als ObjectId (für MongoDB-Queries)

  await dbConnect(); // DB

  // *** [ POST ] ******************************************************
  if (request.method !== "POST") {
    return response.status(405).json({ message: "Method not allowed" });
  }

  try {
    // [ check ]: bereits log für user?
    const existing = await SeedLog.findOne({ userId: userObjectId });
    if (existing) {
      return response.status(200).json({ alreadySeeded: true });
    }

    // [ seed-data ]
    // [1. categories]
    const categoriesSeed = [
      { name: "Salary", type: "Income", color: "#92d9ca" },
      { name: "Freelance", type: "Income", color: "#ffa8db" },
      { name: "Rent", type: "Expense", color: "#fe8b9c" },
      { name: "Groceries", type: "Expense", color: "#a4bde5" },
      { name: "Fun", type: "Expense", color: "#58c696" },
      { name: "Miscellaneous", type: "Expense", color: "#dbec9c" },
    ].map((category) => ({ ...category, userId: userObjectId }));

    const createdCategories = await Category.insertMany(categoriesSeed);

    const categoryByName = new Map(
      createdCategories.map((category) => [category.name, category._id])
    );

    // [2. transactions]
    const transactionsSeed = [
      {
        category: "Salary",
        description: "Employer Ltd.",
        amount: 3500,
        date: "2026-03-02",
      },
      {
        category: "Freelance",
        description: "Employer AG",
        amount: 1400,
        date: "2026-03-16",
      },
      {
        category: "Rent",
        description: "GAG Immo AG",
        amount: 1200,
        date: "2026-03-01",
      },
      {
        category: "Groceries",
        description: "REWE",
        amount: 50,
        date: "2026-03-06",
      },
      {
        category: "Fun",
        description: "Cinema",
        amount: 40,
        date: "2026-03-07",
      },
    ].map((transaction) => ({
      userId: userObjectId,
      category: categoryByName.get(transaction.category),
      description: transaction.description,
      amount: transaction.amount,
      date: new Date(transaction.date),
    }));

    // defensive: falls eine category nicht gefunden
    if (transactionsSeed.some((transaction) => !transaction.category)) {
      return response
        .status(500)
        .json({ message: "Seed failed: category mapping missing" });
    }

    await Transaction.insertMany(transactionsSeed);

    // [ seed log ]: um nicht nochmal zu seeden
    await SeedLog.create({ userId: userObjectId, version: 1 });

    return response.status(201).json({ alreadySeeded: false });
  } catch (error) {
    return response.status(500).json({ message: "Bootstrap failed" });
  }
}
