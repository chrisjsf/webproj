const express = require("express");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.get("/items/:id/claim", requireLogin, async (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).render("error", {
    title: "Item not found",
    message: "That item could not be found."
  });
  try {
    const item = await Item.findById(req.params.id).populate("reporter", "name");
    if (!item || item.reportType !== "found" || item.status !== "open") {
      return res.status(404).render("error", {
        title: "Item unavailable",
        message: "This item is not available for a claim."
      });
    }
    if (item.reporter._id.toString() === req.session.user.id) {
      return res.status(403).render("error", {
        title: "Cannot claim your report",
        message: "You cannot submit a claim for an item you reported."
      });
    }
    const existing = await Claim.exists({ item: item._id, student: req.session.user.id });
    if (existing) {
      return res.status(409).render("error", {
        title: "Claim already submitted",
        message: "You have already submitted a claim for this item. You can check its status in My Claims."
      });
    }
    res.render("claim", { title: "Claim item", item, error: "" });
  } catch (error) {
    next(error);
  }
});

router.post("/items/:id/claim", requireLogin, async (req, res, next) => {
  const explanation = String(req.body.explanation || "").trim();
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(404).render("error", { title: "Item not found", message: "That item could not be found." });
  }
  try {
    const item = await Item.findById(req.params.id).populate("reporter", "name");
    if (!item || item.reportType !== "found" || item.status !== "open") {
      return res.status(404).render("error", { title: "Item unavailable", message: "This item is not available for a claim." });
    }
    if (item.reporter._id.toString() === req.session.user.id) {
      return res.status(403).render("error", { title: "Cannot claim your report", message: "You cannot claim an item you reported." });
    }
    if (!explanation || explanation.length > 1000) {
      return res.status(400).render("claim", {
        title: "Claim item",
        item,
        error: "Explain why you believe this item belongs to you (up to 1,000 characters)."
      });
    }
    const claim = await Claim.create({ item: item._id, student: req.session.user.id, explanation });
    const itemStillOpen = await Item.exists({ _id: item._id, status: "open", reportType: "found" });
    if (!itemStillOpen) {
      await Claim.deleteOne({ _id: claim._id });
      return res.status(409).render("error", {
        title: "Item unavailable",
        message: "The item became unavailable before your claim could be submitted."
      });
    }
    res.redirect(303, "/claims/mine?submitted=1");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).render("error", {
        title: "Claim already submitted",
        message: "You have already submitted a claim for this item."
      });
    }
    next(error);
  }
});

router.get("/claims/mine", requireLogin, async (req, res, next) => {
  try {
    const claims = await Claim.find({ student: req.session.user.id })
      .populate("item", "itemName reportType status location")
      .sort({ createdAt: -1 });
    res.render("my-claims", {
      title: "My claims",
      claims,
      submitted: Boolean(req.query.submitted)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
