function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  if (req.session.user.role !== "admin") {
    return res.status(403).render("error", {
      title: "Access denied",
      message: "Administrator access is required for this page."
    });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
