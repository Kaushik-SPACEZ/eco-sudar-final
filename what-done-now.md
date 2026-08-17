**finance**

What it does
On the Profit & Loss page there's a new "AI Financial Analyst" card. Click "Analyse this period" and the AI reads your actual figures and returns:

A Health Score (0–100) in a colour ring (green/amber/red)
A one-line headline + a plain-language summary of the period
Three columns: Drivers (what's moving profit) · Risks (concrete, with the ₹ numbers) · Recommendations (specific actions)
An Outlook line based on the month-over-month trend
It's on-demand (a button, not auto-run on every page load) so it doesn't burn API calls or slow the page.

How it's grounded & safe
Single source of truth: I refactored pnl() and ratios() to expose their computed data (pnlData/ratiosData), and the AI endpoint reuses those exact numbers — so the analysis can never disagree with the dashboard. The existing P&L and ratios endpoints behave identically (just wrapped).
Privacy: only aggregated totals (revenue, expenses, margins, monthly trend, top expense categories, revenue-by-source) are sent — never raw transactions/customers.
Reuses your existing GroqAPI helper + key; on failure it shows a clear "try again" message rather than breaking the page.



**payroll**

What it does
On the Payroll page (after you generate a month's payroll), there's a new "AI Pre-run Check" button. It audits the month's rows against each employee's own recent history and flags anything that looks wrong before you process or pay:

Net pay swinging sharply vs the employee's baseline (e.g. "+62% vs 3-month avg")
Overtime far above their norm
Missing/zero statutory deductions (PF / professional tax) when their history had them
Negative or zero net pay
present_days > working_days
Advance-deduction spikes
Results show as severity-ranked cards (high / medium / low) with the employee, the specific issue, and the numbers — or a green "No anomalies, safe to process" if all clear. A toast tells you the count immediately.

How it's built (grounded & safe)
Compares to real history: the backend pulls each employee's last 3 months of payroll, computes baselines (avg net pay, OT, PF), and pre-computes the deltas — so the AI judges against facts, not guesses.
Single source of truth: uses Payroll::forMonth() — the same data the payroll table shows.
Privacy: only payroll figures + employee IDs are sent to the AI — not names (names are re-attached locally for display). It's your own payroll, checked by your own Groq key.
Validated output: flags are filtered to real employees/valid severities and sorted high→low; on AI failure it shows a clean "try again" message.
On-demand (a button), so no token spend unless you ask.



**dealer**
The core problem
AuthContext.tsx only accepted user_type === "admin", so dealers could not log in at all — and there was no dealer-facing screen. (The backend dealer workspace /dealer/* already existed and was correctly scoped; nothing on the frontend used it.)

What I built
1. Role-aware login — AuthContext now accepts admin and dealer logins, stores the role, and restores it across refreshes. It also accepts an email or phone as the login identifier (dealers usually use phone), since the backend already supports both.

2. Role-based routing — after login, App.tsx sends:

Dealers → the Dealer Portal (their own layout, no admin sidebar)
Admins/staff → the existing admin app
A dealer can never reach admin screens, and every /dealer/* API call is scoped server-side to their own dealer_id.

3. The Dealer Portal (dealer/DealerPortal.tsx) — a clean, self-contained workspace with its own top bar (logo, dealer name, logout) and three tabs:

Dashboard — KPIs (my customers, orders, this-month value, outstanding) + recent orders, and a notice if any of their customers need review.
My Customers — list + add/edit (name, phone, GSTIN, address…). This is the dealer-side of the mapping: when they add a customer, the server runs the dedupe and tells them if it linked to an existing account or was flagged for review.
My Prices — their effective price list (dealer rate vs standard, per product).
4. Dealer API client (dealer.ts).

How the full flow works now
Admin creates a dealer in the Dealers page (name + phone/email + password) — they're auto-approved & active.
Dealer opens the same login page, enters their phone/email + password → lands in the Dealer Portal (not the admin app).
They manage their customers and see their prices; admins assign each dealer a price list (Dealer Intelligence / price-lists) and resolve any dedupe conflicts from the admin side.

To deploy
Upload the admin/ build (index-BwXSdCNY.js) and hard-refresh. No backend changes were needed (the dealer API + role guard already existed; dealer accounts are already auto-approved).

Try it: create a dealer with a password in the admin Dealers page → log out → log in as that dealer → you'll get the Dealer Portal.

If you want, the next dealer-portal increment is "Place Order" (the /dealer/orders endpoint already exists — a dealer picks a linked customer + products at their price and submits an order). Want that added?









**website dealer**
Now it's a genuinely separate website. Both built and staged. The dealer site ships only dealer code — 332 KB vs the admin's 2.6 MB, and verified contains zero admin pages (Payroll/GstInvoicing/DashboardLayout → 0 matches).

What you now have — two independent sites, one backend
Admin site	Dealer site (new)
URL	your current admin domain	dealer.ecosudar.com
Folder	admin/	dealer/ (new)
Bundle	full admin (2.6 MB)	dealer-only (332 KB)
Login	staff/admin	each dealer's own login
After login	admin app	Dealer Portal (Dashboard · My Customers · My Prices)
API	api.ecosudar.com	same api.ecosudar.com
A dealer who somehow opens the admin site is told "use dealer.ecosudar.com"; an admin who opens the dealer site is told "this portal is for dealers." Sessions are isolated (separate origins).

How it's wired
Separate build: new vite.config.dealer.ts + dealer.html + src/dealer-main.tsx + src/DealerApp.tsx (its own providers + login/portal gate) → npm run build:dealer → dist-dealer/ (renamed to index.html).
Dealer login (DealerLogin.tsx) accepts phone or email + password.
Same backend: dealer site calls the existing /auth/login + scoped /dealer/* APIs.
CORS: added https://dealer.ecosudar.com to the API's allowed origins (api/index.php).

To deploy (the parts only you can do in Hostinger)
Create the subdomain in hPanel → Subdomains → dealer → it gives you a document root folder (e.g. public_html/dealer or a dedicated one). Make sure SSL is on for it.
Upload the contents of the repo's dealer/ folder into that subdomain's document root (the index.html + assets/ etc.).
Upload api/index.php (the CORS change) so dealer.ecosudar.com is allowed to call the API.
Hard-refresh.
That's it — no separate .env or database needed (the dealer build uses the same VITE_API_BASE_URL → same API; the dealer portal is a single page so no SPA-rewrite .htaccess is required).

Try it end-to-end
Admin site → Dealers → create a dealer with a password.
Open dealer.ecosudar.com → that dealer logs in with their phone/email + password → lands in their own portal, sees only their customers and prices.
Each dealer gets their own isolated login and data — exactly what you described.

Want me to add "Place Order" to the dealer portal next (the /dealer/orders API already exists — dealer picks a linked customer + products at their price and submits)? That would complete the dealer's core functionality.