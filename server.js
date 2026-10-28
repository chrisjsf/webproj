require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");

const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");
const claimRoutes = require("./routes/claims");
const adminRoutes = require("./routes/admin");
const { requireLogin } = require("./middleware/auth");

const app = express();
const port = Number(process.env.PORT) || 3000;
let databaseConnection;
let sessionMiddleware;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
  res.locals.currentUser = null;
  res.locals.csrfToken = "";
  next();
});

async function getSessionMiddleware() {
  if (
    !process.env.MONGODB_URI ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32
  ) {
    throw new Error("Set MONGODB_URI and a SESSION_SECRET of at least 32 characters.");
  }

  if (mongoose.connection.readyState !== 1) {
    if (!databaseConnection) {
      databaseConnection = mongoose
        .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
        .catch((error) => {
          databaseConnection = null;
          throw error;
        });
    }
    await databaseConnection;
  }

  if (!sessionMiddleware) {
    sessionMiddleware = session({
      name: "campus.sid",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ client: mongoose.connection.getClient() }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8
      }
    });
  }

  return sessionMiddleware;
}

app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  getSessionMiddleware()
    .then((middleware) => middleware(req, res, next))
    .catch(next);
});

app.use((req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  res.locals.csrfToken = req.session.csrfToken;

  if (req.method === "POST") {
    const submitted = typeof req.body._csrf === "string" ? req.body._csrf : "";
    const expected = req.session.csrfToken;
    if (
      submitted.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))
    ) {
      return res.status(403).render("error", {
        title: "Request could not be verified",
        message: "Reload the page and submit the form again."
      });
    }
  }
  next();
});

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.get("/", (req, res) => res.render("home", { title: "Home" }));
app.use("/", authRoutes);
app.use("/", itemRoutes);
app.use("/", claimRoutes);
app.use("/", adminRoutes);

app.get("/my-reports", requireLogin, (req, res) => {
  res.redirect("/items/mine");
});
app.get("/my-claims", requireLogin, (req, res) => {
  res.redirect("/claims/mine");
});

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page not found",
    message: "We could not find that page."
  });
});

app.use((error, req, res, next) => {
  console.error("Request failed:", error);
  if (res.headersSent) return next(error);
  res.status(500).render("error", {
    title: "Something went wrong",
    message: "The request could not be completed. Please try again."
  });
});

async function start() {
  await getSessionMiddleware();
  app.listen(port, () => {
    console.log(`Campus Lost & Found Portal is running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Could not start the application:", error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
