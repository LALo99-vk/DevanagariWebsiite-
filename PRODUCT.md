# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Local families in Davangere and nearby Karnataka who buy one health drink for the whole household, from children to grandparents. They visit to see what is in the mix, trust who makes it, and order it.

## Product Purpose

Devanagari Health Mix is a high-protein malt powder made from 21 natural grains, millets, pulses, nuts and spices. The website lets families learn about the mix and buy it directly (Google sign-in, cart, Razorpay checkout, order tracking). Success is a visitor who understands what is inside, trusts the maker, and orders.

## Positioning

Davangere's own domestic brand from Sree Shivani Foods: 21 grains in one mix, blended in small batches from a traditional recipe, with a clean label (no added preservatives, no artificial flavours, zero sugar, zero cholesterol).

## Operating Context

- Sold direct on this site; free delivery in Davangere.
- Pack sizes and prices come from the Supabase `products` table (managed in the admin panel).
- The 21 ingredients are listed in `src/data/ingredients.ts`.

## Capabilities and Constraints

- React + Vite + Tailwind; Supabase for data and auth; Razorpay for payments.
- Customer pages: Home, Shop, About, Contact, Cart, Checkout, Profile, Orders, Terms. Admin pages are out of scope for design work.
- Existing site wording stays unchanged unless the client approves new copy.

## Brand Commitments

- Name: Devanagari (product), manufactured by Sree Shivani Foods.
- Logo: `src/assets/sreeshivanilogo.png` (brown badge, green leaves and swoosh).
- Client-pinned look: Dark Emerald & Gold (chosen from the client's mockups).
- The animated gold "Devanagari" wordmark with the licking smile in the navbar is a confirmed signature element.

## Evidence on Hand

- FSSAI No: 11225313000263; ISO Certified.
- Address: #5187/A-22, Banashankari Badavane Davangere-577004, Karnataka. Phone 9964560622, email sreeshivanifoods@gmail.com.
- Pack flyer (`src/assets/sreeshivanihero.png`): 22g protein in 100g, suitable for all ages, no added preservatives, no artificial flavours, zero sugar, zero cholesterol, zero trans fat.
- Vision and mission statements (existing About copy).
- Product photos in `src/assets/` (heromain2/3/4, pack front, process images).
- Absent, do not fabricate: founder name, founding year, company story, team, testimonials, customer counts, awards.

## Product Principles

1. Show what is inside before asking for trust: the 21 ingredients are the proof.
2. Local and honest: lead with Davangere and the real maker, never invented credentials.
3. One mix for the whole family: speak to households, not athletes alone.
4. Keep the client's wording; new copy needs approval.
