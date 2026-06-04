import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amountOwed: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
});

const billSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    date: { type: String, required: true },
    participants: [participantSchema],
  },
  { timestamps: true }
);

// Virtual 'id' field agar GraphQL bisa pakai field `id` (bukan `_id`)
billSchema.set("toJSON", { virtuals: true });
billSchema.set("toObject", { virtuals: true });

const Bill = mongoose.model("Bill", billSchema);
export default Bill;
