import dbConnect from "@/db/connect";
import Category from "@/db/models/Category";
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
      // Kategorien mit zugehörigen Transaktionen abrufen & totalAmount berechnen
      const categories = await Category.aggregate([
        {
          // lookup-Integration: um Transaktionen in Kategorie zu integrieren
          $lookup: {
            from: "transactions", // Collection, die durchsucht wird
            localField: "_id", // Feld in Category-Collection
            foreignField: "category", // Feld in Transaction-Collection
            as: "transactions", // neues Feld, das die integrierten Transaktionen enthält
          },
        },
        {
          // totalAmount berechnen & neues Feld zur Kategorie hinzufügen
          $addFields: {
            totalAmount: { $sum: "$transactions.amount" }, // Summe aller amounts der integrierten Transaktionen
          },
        },
      ]);
      response.status(200).json(categories);
    } catch (error) {
      response.status(500).json({ error: "Failed to fetch categories" });
    }
  } else if (request.method === "POST") {
    try {
      const newCategory = new Category(request.body); // erstellt neue Kategorie
      const savedCategory = await newCategory.save(); // speichert neue Kategorie

      response.status(201).json(savedCategory);
    } catch (error) {
      response.status(500).json({ error: "Failed to create category" });
    }
  } else {
    response.status(405).json({ message: "Method not allowed" });
  }
}

/* 
Anstatt Feld "totalAmount" direkt in der collection zu speichern, besser "totalAmount" dynamisch mit Aggregation in MongoDB berechnen, weil:

1. Dynamische Datenaktualisierung
   Wenn sich Transaktionen ändern (bearbeitet / gelöscht / neu hinzugefügt), wird totalAmount automatisch aktualisiert.
   Es muss keine manuelle Aktualisierung des Felds durchgeführt werden.
   = Code effizienter & weniger fehleranfällig.

2. Vermeidung Dateninkonsistenz
   Wäre totalAmount als festes Feld in der collection gespeichert, müsste er jedes Mal manuell aktualisiert werden, wenn sich Transaktionen ändern.
   Ein nicht korrekt aktualisierter Wert kann zu Dateninkonsistenzen führen.
   Durch Aggregation berechnet MongoDB totalAmount basierend auf aktuellen Daten jedes Mal neu.
   = Wert immer korrekt.
*/
