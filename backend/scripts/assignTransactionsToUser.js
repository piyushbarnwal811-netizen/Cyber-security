import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

dotenv.config();

const getArgValue = (name) => {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.split("=")[1] : null;
};

const run = async () => {
  const email = (getArgValue("--email") || "").trim().toLowerCase();

  if (!email) {
    console.error("Usage: node scripts/assignTransactionsToUser.js --email=user@example.com");
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const result = await Transaction.updateMany(
    { user: { $exists: false } },
    { $set: { user: user._id } }
  );

  console.log(`Assigned ${result.modifiedCount} transactions to ${email}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Migration failed:", error.message);
  await mongoose.connection.close();
  process.exit(1);
});
