---
version: 1
slug: "src-pages-contact-tsx"
primary_target: "src/pages/Contact.tsx"
related_targets: []
---

Scope: /contact route (src/pages/Contact.tsx). Visitor mode: Operate (the visitor's job is to reach Sree Shivani Foods).

Audience: local families and shops. Reasons: order & delivery help, product questions, bulk / shop orders.
Task: pick a topic, write a message, send it; or call / email directly. Messages are saved to Supabase table `contact_messages` (SQL in database-contact-messages.sql; the client runs it once).
States owed: idle, topic chosen, sending, sent (receipt), error (with phone/email fallback), signed-in prefill of name/email.
Constraint: must not look like the About pack panel. New copy needs client approval; flagged strings: "Replies by phone or email", "Bulk Orders", "Your copy", "Not sent", the error line.

## Direction contract

THESIS: Contacting the shop feels like messaging it: Sree Shivani Foods greets you in a thread and your message lands as a sent bubble with a carbon-copy receipt. It refuses the stacked form beside an info card.

OWN-WORLD: Emerald-950 ground, a tall emerald-900 thread panel with a 1px gold hairline, shop bubbles in emerald-800 (left, small tail corner), visitor bubbles in gold with dark text (right), gold-outline topic chips that fill gold when chosen, Fraunces for the heading and receipt numerals, Figtree for messages. Lucide icons only.

STORY: The visitor sees how to reach the shop at once (phone, email, address, hours), picks why they are writing, writes, sends, and gets a receipt that says it was received and that the reply comes by phone or email.

FIRST VIEWPORT: Left ~24rem: h1 "Get in Touch" (gold italic "Touch"), lead line, tap-to-call, email, address. Right: thread panel with header (badge logo avatar, Sree Shivani Foods, replies line), greeting bubble, business hours bubble, "What's this about?" bubble with three topic chips, composer pinned at the bottom (name, email, message, Send Message). Mobile: heading and channels, then the thread full width.

Signature interaction: the shop's bubbles arrive one by one after a short typing indicator on load; on send, the visitor's bubble slides in from the right, a "Received" tick appears, then the shop's thank-you bubble and the torn-off receipt. Motion grammar: ease-out-quart, 12px travel, reduced motion shows the final thread.

FORM: Conversation, position 4 of 7 on the ordered list, seed:479614ca36510ca5

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
