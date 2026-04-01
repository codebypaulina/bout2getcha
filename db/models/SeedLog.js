import mongoose from "mongoose";

const { Schema } = mongoose;

const seedLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      unique: true,
    },
    seededAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  { timestamps: true }
);

const SeedLog =
  mongoose.models.SeedLog || mongoose.model("SeedLog", seedLogSchema);

export default SeedLog;
