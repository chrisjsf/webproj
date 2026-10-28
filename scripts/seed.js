require("dotenv").config();

const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Item = require("../models/Item");

const examples = [
  {
    itemName: "Blue water bottle",
    category: "Bottle",
    reportType: "found",
    description: "Blue metal bottle with a small scratch near the lid.",
    location: "Library ground floor",
    date: new Date("2025-09-12T00:00:00.000Z")
  },
  {
    itemName: "Black umbrella",
    category: "Accessories",
    reportType: "lost",
    description: "Compact black umbrella with a wooden handle.",
    location: "Outside the main auditorium",
    date: new Date("2025-09-14T00:00:00.000Z")
  },
  {
    itemName: "Physics lab notebook",
    category: "Books",
    reportType: "found",
    description: "A ruled notebook with a green cover. The name is not visible.",
    location: "Science block, room 204",
    date: new Date("2025-09-16T00:00:00.000Z")
  }
];

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be set in your .env file.");
  await mongoose.connect(process.env.MONGODB_URI);
  let reporter = await User.findOne({ email: "sample-reporter@campus.invalid" });
  if (!reporter) {
    reporter = new User({
      name: "Sample Reporter",
      email: "sample-reporter@campus.invalid",
      rollNumber: `SAMPLE-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
    });
    await reporter.setPassword(crypto.randomBytes(32).toString("hex"));
    await reporter.save();
  }

  let inserted = 0;
  for (const example of examples) {
    const exists = await Item.exists({
      reporter: reporter._id,
      itemName: example.itemName,
      date: example.date
    });
    if (!exists) {
      await Item.create({ ...example, reporter: reporter._id });
      inserted += 1;
    }
  }
  console.log(`Seed complete. Added ${inserted} sample item report(s).`);
}

run()
  .catch((error) => {
    console.error("Could not seed sample data:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
