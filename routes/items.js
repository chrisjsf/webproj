const express = require("express");
const mongoose = require("mongoose");
const Item = require("../models/Item");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderReport(res, error, values, status = 400) {
  return res.status(status).render("report", { title: "Report an item", error, values });
}

router.get("/items", async (req, res, next) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const reportType = ["lost", "found"].includes(req.query.type) ? req.query.type : "";
  const query = {};
  if (reportType) query.reportType = reportType;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    query.$or = [{ itemName: pattern }, { description: pattern }, { category: pattern }, { location: pattern }];
  }
  try {
    const items = await Item.find({ ...query, status: { $ne: "deleted" } })
      .populate("reporter", "name")
      .sort({ createdAt: -1 })
      .limit(100);
    res.render("browse", {
      title: "Browse items",
      items,
      q,
      reportType,
      reported: req.query.reported === "1"
    });
  } catch (error) {
    next(error);
  }
});

router.get("/items/report", requireLogin, (req, res) => {
  res.render("report", { title: "Report an item", error: "", values: {} });
});

router.post("/items/report", requireLogin, async (req, res, next) => {
  const values = {
    itemName: String(req.body.itemName || "").trim(),
    category: String(req.body.category || "").trim(),
    reportType: String(req.body.reportType || ""),
    location: String(req.body.location || "").trim(),
    date: String(req.body.date || ""),
    description: String(req.body.description || "").trim(),
    imageUrl: String(req.body.imageUrl || "").trim()
  };
  const reportDate = new Date(`${values.date}T00:00:00.000Z`);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(values.date) &&
    !Number.isNaN(reportDate.valueOf()) &&
    reportDate.toISOString().slice(0, 10) === values.date;
  let validImageUrl = true;
  if (values.imageUrl) {
    try {
      const url = new URL(values.imageUrl);
      validImageUrl = url.protocol === "http:" || url.protocol === "https:";
    } catch {
      validImageUrl = false;
    }
  }

  if (
    !values.itemName || values.itemName.length > 100 ||
    !values.category || values.category.length > 50 ||
    !["lost", "found"].includes(values.reportType) ||
    !values.location || values.location.length > 120 ||
    !validDate ||
    !values.description || values.description.length > 1000 ||
    values.imageUrl.length > 500 || !validImageUrl
  ) {
    return renderReport(res, "Complete every required field and check the image URL.", values);
  }

  try {
    await Item.create({
      ...values,
      date: reportDate,
      reporter: req.session.user.id
    });
    res.redirect("/items?reported=1");
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return renderReport(res, "The report could not be saved. Check the entered details.", values);
    }
    next(error);
  }
});

router.get("/items/mine", requireLogin, async (req, res, next) => {
  try {
    const items = await Item.find({ reporter: req.session.user.id }).sort({ createdAt: -1 });
    res.render("my-reports", {
      title: "My reports",
      items,
      deleted: req.query.deleted === "1",
      deleteError: req.query.deleteError === "1"
    });
  } catch (error) {
    next(error);
  }
});

router.post("/items/:id/delete", requireLogin, async (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.redirect(303, "/items/mine?deleteError=1");
  }

  try {
    const item = await Item.findOneAndUpdate(
      {
        _id: req.params.id,
        reporter: req.session.user.id,
        status: "open"
      },
      { $set: { status: "deleted" } },
      { new: true }
    );
    if (!item) return res.redirect(303, "/items/mine?deleteError=1");
    res.redirect(303, "/items/mine?deleted=1");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
