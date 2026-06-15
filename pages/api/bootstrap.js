import mongoose from "mongoose";
import dbConnect from "@/db/connect";
import SeedLog from "@/db/models/SeedLog";
import Category from "@/db/models/Category";
import Transaction from "@/db/models/Transaction";
import { getAuthenticatedDbUserId } from "@/utils/apiAuth";

const DEF_CATEGORIES = [
  { name: "Salary", type: "Income", color: "#9abae5" },
  { name: "Freelance", type: "Income", color: "#ffa8db" },
  { name: "Housing", type: "Expense", color: "#fffafa" },
  { name: "Insurance", type: "Expense", color: "#64e826" },
  { name: "Savings", type: "Expense", color: "#b970e1" },
  { name: "Groceries", type: "Expense", color: "#ff941a" },
  { name: "Transportation", type: "Expense", color: "#52aeff" },
  { name: "Subscriptions", type: "Expense", color: "#fff700" },
  { name: "Fun", type: "Expense", color: "#f74586" },
  { name: "Eating Out", type: "Expense", color: "#fb5b5e" },
  { name: "Miscellaneous", type: "Expense", color: "#c9c9cf" },
];

const DEF_TRANSACTIONS = [
  { category: "Salary", description: "Company XY", amount: 2500, day: 1 },
  { category: "Freelance", description: "Client XY", amount: 750, day: 13 },
  { category: "Freelance", description: "Client AB", amount: 345, day: 25 },
  { category: "Housing", description: "Rent", amount: 985, day: 1 },
  { category: "Housing", description: "Utilities", amount: 252.47, day: 5 },
  { category: "Housing", description: "Electricity", amount: 39.16, day: 5 },
  { category: "Housing", description: "Internet", amount: 27.93, day: 15 },
  {
    category: "Insurance",
    description: "Home Contents",
    amount: 11.56,
    day: 8,
  },
  { category: "Insurance", description: "Liability", amount: 6.13, day: 14 },
  { category: "Insurance", description: "Disability", amount: 56.48, day: 15 },
  {
    category: "Insurance",
    description: "Supplemental Health",
    amount: 19.15,
    day: 15,
  },
  {
    category: "Insurance",
    description: "Legal Protection",
    amount: 21.75,
    day: 24,
  },
  { category: "Savings", description: "Trade Republic", amount: 250, day: 5 },
  { category: "Savings", description: "C24", amount: 150, day: 5 },
  { category: "Groceries", description: "dm", amount: 48.63, day: 6 },
  { category: "Groceries", description: "REWE", amount: 71.82, day: 6 },
  { category: "Groceries", description: "Lidl", amount: 53.98, day: 24 },
  {
    category: "Transportation",
    description: "E-Scooter",
    amount: 7.19,
    day: 3,
  },
  {
    category: "Transportation",
    description: "Public Transit Pass",
    amount: 63,
    day: 15,
  },
  {
    category: "Transportation",
    description: "ICE (B → Cgn)",
    amount: 42.98,
    day: 21,
  },
  { category: "Subscriptions", description: "Netflix", amount: 13.99, day: 4 },
  { category: "Subscriptions", description: "ChatGPT", amount: 23, day: 11 },
  {
    category: "Subscriptions",
    description: "Urban Sports",
    amount: 75,
    day: 15,
  },
  {
    category: "Subscriptions",
    description: "Amazon Prime",
    amount: 7.4,
    day: 19,
  },
  {
    category: "Subscriptions",
    description: "Mobile Plan",
    amount: 34.99,
    day: 26,
  },
  { category: "Fun", description: "Museum", amount: 11, day: 7 },
  { category: "Fun", description: "Paintball", amount: 56.81, day: 12 },
  { category: "Fun", description: "Cinema", amount: 42.76, day: 20 },
  { category: "Fun", description: "Concert", amount: 149.98, day: 23 },
  { category: "Eating Out", description: "Burger King", amount: 14.38, day: 9 },
  {
    category: "Eating Out",
    description: "60 sec to napoli",
    amount: 34.54,
    day: 17,
  },
  {
    category: "Eating Out",
    description: "L'Osteria",
    amount: 29.71,
    day: 23,
  },

  {
    category: "Miscellaneous",
    description: "B-Day Gift Mom",
    amount: 68.13,
    day: 12,
  },
  {
    category: "Miscellaneous",
    description: "Speeding Ticket",
    amount: 25,
    day: 27,
  },
];

// um transactions auf Monat + Jahr vom 1. Login zu datieren
function createSeedDate(day) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day);
}

export default async function handler(request, response) {
  // *** [ auth + user ]
  const dbUserId = await getAuthenticatedDbUserId(request, response);
  if (!dbUserId) return;

  // *** [ method guard ]
  if (request.method !== "POST") {
    return response.status(405).json({ message: "Method not allowed" });
  }

  // *** [ db setup ]
  await dbConnect(); // MongoDB-Verbindung (nur wenn POST)
  const dbSession = await mongoose.startSession(); // MongoDB-Session (für Transaction)
  const dbSessionTransaction = { session: dbSession }; // um dbSession weiterzugegeben

  // *** [ bootstrap ]
  try {
    // [ MongoDB-Transaction ]: Rahmen innerhalb dbSession ***********************
    // -> was dbSessionTransaction bekommt (create + insertMany), gehört zur lfd Transaction (SeedLog + categories + transactions)
    // -> wenn irgendwo Fehler, wird nichts davon gespeichert
    await dbSession.withTransaction(async () => {
      // [ seed-log ]: zuerst erstellen, weil SeedLog.userId = unique (kein doppelter seed bei parallelen requests)
      await SeedLog.create(
        [{ userId: dbUserId, version: 1 }],
        dbSessionTransaction
      );

      // [ seed-data ]: categories *******************
      const categoriesSeed = DEF_CATEGORIES.map((category) => ({
        ...category,
        userId: dbUserId,
      })); // mit user-id

      const createdCategories = await Category.insertMany(
        categoriesSeed,
        dbSessionTransaction
      ); // in db speichern

      const categoryByName = new Map(
        createdCategories.map((category) => [category.name, category._id])
      ); // name mit db-id verbinden

      // [ seed-data ]: transactions *****************
      const transactionsSeed = DEF_TRANSACTIONS.map((transaction) => ({
        userId: dbUserId,
        category: categoryByName.get(transaction.category),
        description: transaction.description,
        amount: transaction.amount,
        date: createSeedDate(transaction.day),
      }));

      if (transactionsSeed.some((transaction) => !transaction.category)) {
        throw new Error("Seed failed: category mapping missing");
      } // abbrechen, wenn category nicht existiert

      await Transaction.insertMany(transactionsSeed, dbSessionTransaction); // in db speichern
    });
    // ***************************************************************************

    return response.status(201).json({ alreadySeeded: false });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(200).json({ alreadySeeded: true });
    } // duplicate key error: SeedLog.userId existiert bereits

    return response.status(500).json({ message: "Bootstrap failed" });
  } finally {
    await dbSession.endSession();
  }
}
