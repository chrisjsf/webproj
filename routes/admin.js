const express = require("express");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/admin", requireAdmin, async (req, res, next) => {
  try {
    const [items, claims] = await Promise.all([
      Item.find().populate("reporter", "name email").sort({ createdAt: -1 }).limit(100),
      Claim.find()
        .populate("item", "itemName status reportType")
        .populate("student", "name email rollNumber")
        .sort({ createdAt: -1 })
        .limit(100)
    ]);
    res.render("admin", {
      title: "Administrator",
      items,
      claims,
      message: req.query.updated ? "The requested update was completed." : "",
      error: req.query.error ? "That update could not be completed. The claim or item may have changed." : ""
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/claims/:id", requireAdmin, async (req, res, next) => {
  const decision = String(req.body.decision || "");
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.redirect(303, "/admin?error=1");
  if (!["approve", "reject"].includes(decision)) return res.redirect(303, "/admin?error=1");

  try {
    const claim = await Claim.findById(req.params.id).populate("item");
    if (!claim || claim.status !== "pending" || !claim.item) {
      return res.redirect(303, "/admin?error=1");
    }

    if (decision === "reject") {
      const result = await Claim.updateOne(
        { _id: claim._id, status: "pending" },
        { $set: { status: "rejected" } }
      );
      return res.redirect(303, result.modifiedCount ? "/admin?updated=1" : "/admin?error=1");
    }

    if (claim.item.reportType !== "found") return res.redirect(303, "/admin?error=1");
    const itemLock = await Item.updateOne(
      { _id: claim.item._id, reportType: "found", status: "open" },
      { $set: { status: "claimed" } }
    );
    if (!itemLock.modifiedCount) return res.redirect(303, "/admin?error=1");

    const claimUpdate = await Claim.updateOne(
      { _id: claim._id, status: "pending" },
      { $set: { status: "approved" } }
    );
    if (!claimUpdate.modifiedCount) {
      await Item.updateOne({ _id: claim.item._id, status: "claimed" }, { $set: { status: "open" } });
      return res.redirect(303, "/admin?error=1");
    }

    await Claim.updateMany(
      { item: claim.item._id, _id: { $ne: claim._id }, status: "pending" },
      { $set: { status: "rejected" } }
    );
    res.redirect(303, "/admin?updated=1");
  } catch (error) {
    next(error);
  }
});

router.post("/admin/items/:id/return", requireAdmin, async (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.redirect(303, "/admin?error=1");
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, reportType: "found", status: "claimed" },
      { $set: { status: "returned" } },
      { new: true }
    );
    if (!item) return res.redirect(303, "/admin?error=1");
    res.redirect(303, "/admin?updated=1");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
