require("dotenv").config();

const readline = require("readline");
const mongoose = require("mongoose");
const User = require("../models/User");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be set in your .env file.");
  const name = (await ask("Administrator name: ")).trim();
  const email = (await ask("Administrator college email: ")).trim().toLowerCase();
  const rollNumber = (await ask("Administrator roll number: ")).trim().toUpperCase();
  const password = await ask("Administrator password (input is visible): ");

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !rollNumber || password.length < 12) {
    throw new Error("Enter a name, valid email, roll number, and a password of at least 12 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const user = new User({ name, email, rollNumber, role: "admin" });
  await user.setPassword(password);
  await user.save();
  console.log(`Administrator account created for ${email}.`);
}

run()
  .catch((error) => {
    console.error("Could not create administrator:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
