const express = require("express");
const User = require("../models/User");

const router = express.Router();

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.get("/register", (req, res) => {
  res.render("register", { title: "Register", error: "", values: {} });
});

router.post("/register", async (req, res, next) => {
  const values = {
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim().toLowerCase(),
    rollNumber: String(req.body.rollNumber || "").trim().toUpperCase()
  };
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!values.name || values.name.length > 80 || !values.email || !validEmail(values.email)) {
    return res.status(400).render("register", {
      title: "Register",
      error: "Enter your name and a valid college email address.",
      values
    });
  }
  if (!values.rollNumber || values.rollNumber.length > 30) {
    return res.status(400).render("register", {
      title: "Register",
      error: "Enter a valid roll number.",
      values
    });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).render("register", {
      title: "Register",
      error: "Password must be between 8 and 128 characters.",
      values
    });
  }
  if (password !== confirmPassword) {
    return res.status(400).render("register", {
      title: "Register",
      error: "The passwords do not match.",
      values
    });
  }

  try {
    const user = new User(values);
    await user.setPassword(password);
    await user.save();
    res.redirect("/login?registered=1");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).render("register", {
        title: "Register",
        error: "That email address or roll number is already registered.",
        values
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).render("register", {
        title: "Register",
        error: "Please check the details and try again.",
        values
      });
    }
    next(error);
  }
});

router.get("/login", (req, res) => {
  res.render("login", {
    title: "Login",
    error: "",
    message: req.query.registered ? "Registration complete. You can now log in." : "",
    loginId: ""
  });
});

router.post("/login", async (req, res, next) => {
  const loginId = String(req.body.loginId || "").trim();
  const password = String(req.body.password || "");
  try {
    const user = await User.findOne({
      $or: [{ email: loginId.toLowerCase() }, { rollNumber: loginId.toUpperCase() }]
    }).select("+passwordHash");
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).render("login", {
        title: "Login",
        error: "The email/user ID or password is incorrect.",
        message: "",
        loginId
      });
    }

    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        role: user.role
      };
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.redirect("/");
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("campus.sid");
    res.redirect("/");
  });
});

module.exports = router;
