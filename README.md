# Campus Lost & Found Portal

A small academic project for reporting lost and found campus items. It uses server-rendered EJS pages, standard HTML forms, Express sessions, and MongoDB through Mongoose. It is intended for learning and classroom demonstrations, not as a production service.

## Prerequisites

- Node.js 18 or later and npm.
- MongoDB Community Server running locally, or a MongoDB Atlas connection string.
- VS Code (recommended).

For a local Windows MongoDB install, install MongoDB Community Server using the official Windows installer and select the option to install MongoDB as a Windows service. Then start and check the service from PowerShell:

```powershell
Start-Service MongoDB
Get-Service MongoDB
```

If the service is not installed or you prefer not to install a local database, create a MongoDB Atlas database and set `MONGODB_URI` in `.env` to its connection URI. Replace the URI's username, password, and database name with your own values, and allow your development machine's IP address in Atlas network access settings.

## Install and configure (Windows)

Open the project folder in VS Code, then open **Terminal > New Terminal** (PowerShell):

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set `MONGODB_URI` to your local MongoDB URI or Atlas URI. Replace `SESSION_SECRET` with a long, random value. For example, PowerShell can generate a value with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `.env`. Do not share or commit `.env`.

## Create an administrator account

Start MongoDB and run:

```powershell
npm run create-admin
```

Enter an administrator name, college email, roll number, and a unique password of at least 12 characters. Password input is visible while entering it in this academic prototype terminal tool. The password is hashed with bcrypt before it is stored. Registration on the website always creates a student account; it cannot grant administrator privileges.

## Start the application

```powershell
npm start
```

For development with Node's file watcher:

```powershell
npm run dev
```

Open <http://localhost:3000> in your browser. If you set another `PORT` in `.env`, use that port instead. The application checks MongoDB connectivity before it starts and prints an error if configuration or connection fails.

## Deploy to Vercel

The Express app is exported from `server.js` for Vercel's Node.js runtime. In the Vercel project settings, leave the Build Command and Output Directory empty; use `npm ci` as the Install Command if one is required. Add `MONGODB_URI` and a `SESSION_SECRET` of at least 32 characters under the project's environment variables. Use a MongoDB Atlas URI and configure Atlas network access to allow connections from your deployment.

## Try the features

1. Open **Register**, create a student account, then log in with the college email or roll number.
2. Choose **Report an Item**, submit Lost and Found examples, and browse them on **Browse Items**. Reports are persisted in MongoDB.
3. Sign in as a different student, open a found report, and submit a claim explaining how you can identify the item.
4. Open **My Claims** to see its pending status. Log out and sign in using the administrator credentials created with `npm run create-admin`.
5. Open **Admin**, approve or reject pending claims. Approval marks an item claimed and automatically rejects other pending claims for that item. Once handover is verified, mark the item returned.
6. Log in as the reporting student and open **My Reports** to see the report status. The student claimant can view claim status in **My Claims**.
7. To populate a fresh database with clearly identified example reports, run `npm run seed`. This is optional and safe to rerun; sample reports are not embedded in the browse page.

## Folders and files

- `server.js` — Express app setup, session configuration, MongoDB connection, and error handling.
- `package.json` / `package-lock.json` — Project scripts and pinned dependency versions.
- `.env.example` — Environment variable template; copy to `.env`.
- `.gitignore` — Keeps local dependencies, `.env`, and npm debug logs out of version control.
- `models/User.js` — Student and administrator accounts, roles, and bcrypt password helpers.
- `models/Item.js` — Lost/found item details, reporter reference, and item status.
- `models/Claim.js` — Student claims, item/student references, and unique claim-per-item rule.
- `routes/auth.js` — Registration, login, and logout.
- `routes/items.js` — Browse/search, create reports, and view a student's reports.
- `routes/claims.js` — Submit claims and view a student's claim history.
- `routes/admin.js` — Administrator claim decisions and item-return updates.
- `middleware/auth.js` — Login and administrator route protection.
- `views/home.ejs`, `login.ejs`, `register.ejs` — Landing page and account forms.
- `views/browse.ejs`, `report.ejs`, `claim.ejs` — Item search, reporting, and claiming forms/pages.
- `views/my-reports.ejs`, `my-claims.ejs`, `admin.ejs` — Student status pages and administrator workflow.
- `views/error.ejs` — Shared error page.
- `views/partials/header.ejs`, `footer.ejs` — Shared page navigation and footer.
- `public/style.css` — Shared responsive stylesheet.
- `scripts/create-admin.js` — Interactive one-time administrator account creation.
- `scripts/seed.js` — Optional idempotent sample item data.

## Data model and workflow

- **User** stores a name, unique email, unique roll number, bcrypt password hash, and `student` or `admin` role.
- **Item** stores the report details and references its reporter. Its status is `open`, `claimed`, or `returned`.
- **Claim** references a found item and student, stores the explanation, and tracks `pending`, `approved`, or `rejected`. A student may submit at most one claim per item.
- A student reports an item; found and lost reports appear in the browse list. A different logged-in student can submit a claim on an open found item. An administrator reviews the claim; approving it reserves the item and rejects any other pending claims for it. After verifying handover, the administrator marks the item returned.
- Students can remove their own open reports from public browsing. This is a soft delete: the report record and any submitted claims are retained for history, and reports already claimed or returned cannot be removed.

## Limitations and security notes

- This is an academic prototype. It should receive additional security testing before any real-world deployment.
- The sample does not include email verification, password reset, image uploads, notifications, or a formal moderation process. Images are optional external HTTP(S) URLs.
- Configure HTTPS and `NODE_ENV=production` when deploying. The session cookie is marked secure in production; MongoDB and session secrets must be protected. Form submissions use a per-session CSRF token.
- The administrator creation script displays the password as it is typed. Use it only in a trusted local terminal and do not record the password in shared command history.
- No college-specific email domain is enforced; change the server-side validation if your institution requires one.
- The administrator list is limited to the most recent 100 records for readability.
