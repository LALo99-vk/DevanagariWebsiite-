---
version: 1
slug: "src-pages-admin-dashboard-tsx"
primary_target: "src/pages/admin/Dashboard.tsx"
related_targets: ["src/components/AdminLayout.tsx","src/components/AdminRoute.tsx","src/pages/admin/Products.tsx","src/pages/admin/Orders.tsx","src/pages/admin/PromoCodes.tsx","src/pages/admin/Refunds.tsx","src/pages/admin/Users.tsx","src/pages/admin/Analytics.tsx","src/pages/admin/Settings.tsx"]
---

# Admin panel

Scope: the whole admin surface (`src/components/AdminLayout.tsx`, `src/components/AdminRoute.tsx`, `src/pages/admin/*`). Mode: Operate. Desktop-first (laptop), usable on phone.

Audience: the shop owner and staff of Sree Shivani Foods. Jobs, all frequent: check sales and earnings, edit products and stock, process new orders, manage promo codes and refunds. Earnings must be what customers actually paid after coupons and refunds (client complaint: a ₹200 product bought for ₹180 showed as ₹200).

Constraints: every existing admin function keeps working (product CRUD, order status, refunds via server, promo CRUD, user roles, super-admin settings). Light ivory register chosen by the user; it replaces the old gray/blue look entirely. Customer site stays as is.

## Direction contract

THESIS: The admin opens on the shop shelf: the three Devanagari packs standing side by side, each with its price, the stock left in the pouch and what it actually earned, because for a three-product shop the products are the dashboard. It refuses the category default of a KPI-tile row over a generic recent-orders table.

OWN-WORLD: Ivory paper ground (#F6F0E4) with raised ivory panels (#FBF7EE) and 1px wheat rules (#DCCFAF); a solid forest-ink side rail (#14402E) carries navigation, active item inverted to ivory. Forest-ink primary buttons with 8px corners, outlined forest secondary buttons. Fraunces 350 for page titles and pack names with one forest italic turn each; Figtree for everything operated; tabular figures for all money and counts. State colours only where they mean something: amber for to-ship, sage for delivered, brick (#B4412F) for low stock, cancelled and refunds.

STORY: The owner sees at a glance what each pack earned and how much is left, notices the one low pack and the orders waiting to ship, then acts: edits a price or stock in place, ships an order, pauses a coupon.

FIRST VIEWPORT: Forest rail left (232px) with Shelf, Orders (count badge of orders to ship), Earnings, Promo codes, Refunds, Customers, Settings, and View shop at the foot. Main: title "The shelf" with a one-line description at left, three totals at right (earned after coupons, orders, to ship). Below, three equal pack columns; each holds name with italic weight, price with Edit, a pouch-shaped stock gauge filled to the level left, units sold and earned, a low-stock warning when under 10, and its latest orders with status chips. Under the shelf, promo codes and refunds side by side.

FORM: The Pack Shelf, position 6 of 7 on the ordered list. seed:424239035b3b0f47. Signature move: the pouch stock gauge, a vertical pack outline filled in forest ink to the stock level, turning brick when low; it fills up once on load and recurs at small size in the Products table.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
