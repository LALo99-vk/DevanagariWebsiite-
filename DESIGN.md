---
name: Devanagari Health Mix
description: Dark Emerald & Gold storefront for Sree Shivani Foods' 21-ingredient health mix.
colors:
  emerald-ground: "#0A1F16"
  emerald-raised: "#0F2A1F"
  emerald-well: "#14352A"
  gold-ink: "#C9A45C"
  gold-light: "#DCC089"
  gold-pale: "#E6D09D"
  gold-cream: "#F3E6C6"
  gold-pressed: "#B08B45"
  cream: "#EFE6D2"
  mist: "#B7C2B1"
  mint-note: "#8CCBA9"
  ivory: "#F6F0E4"
  forest-ink: "#14402E"
  forest-ink-deep: "#0B2118"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "4.25rem"
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 350
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 350
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  body-sm:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  chip: "8px"
  image: "12px"
  panel: "14px"
  pill: "9999px"
spacing:
  gutter: "20px"
  gutter-wide: "32px"
  row: "20px"
  section: "96px"
  section-wide: "128px"
components:
  button-gold:
    backgroundColor: "{colors.gold-ink}"
    textColor: "{colors.emerald-ground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-gold-hover:
    backgroundColor: "{colors.gold-light}"
  button-gold-active:
    backgroundColor: "{colors.gold-pressed}"
  button-outline-gold:
    textColor: "{colors.gold-pale}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  link-gold:
    textColor: "{colors.gold-light}"
    typography: "{typography.body-sm}"
  panel:
    backgroundColor: "{colors.emerald-raised}"
    rounded: "{rounded.panel}"
  product-card:
    backgroundColor: "{colors.emerald-raised}"
    rounded: "{rounded.panel}"
    padding: "24px"
  badge-gold:
    backgroundColor: "{colors.gold-ink}"
    textColor: "{colors.emerald-ground}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  field-dark:
    textColor: "{colors.cream}"
    padding: "12px 0"
  pack-label-cell:
    backgroundColor: "{colors.gold-ink}"
    textColor: "{colors.emerald-ground}"
    typography: "{typography.label}"
    padding: "20px"
  button-ivory-primary:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.chip}"
    padding: "12px 24px"
  button-ivory-primary-hover:
    backgroundColor: "{colors.forest-ink-deep}"
---

# Design System: Devanagari Health Mix

## Overview

**Creative North Star: "Gold Ink on the Emerald Pouch"**

The customer site is the pack itself, opened up: a deep, solid emerald ground with gold used the way a printer uses foil ink, for headings, hairline rules, icons and the one primary action. Nothing glows, nothing is frosted, nothing floats on a shadow. Depth comes from two close steps of emerald and from gold 1px rules at low opacity, so the page reads as printed matter rather than as an app.

The world is client-pinned (Dark Emerald & Gold) and carries Indian craft through drawn geometry rather than texture: a gold line rangoli that draws itself in like chalk around the hero product photo, a pointy-top honeycomb that holds the 21 ingredients, and the animated "Devanagari" wordmark whose gold smile licks a drop of milk. Type pairs Fraunces (light, with one gold italic turn per heading) with Figtree for everything a family has to read or tap.

Transactional pages (Cart, Checkout, Profile, Orders, Terms) step out of the dark into a light ivory register with forest-green ink, so forms and order details read like a receipt. Admin is out of scope.

**Key Characteristics:**
- Solid emerald surfaces, two steps only; gold as ink, never as light.
- Fraunces light display with a single gold italic phrase; Figtree body.
- Hairline gold rules (15-35% opacity) separate everything; no shadows on the dark world.
- Pill-shaped actions, 14px panels, circular product frame inside the rangoli.
- One easing curve for all entrances; reduced motion shows the finished state.

## Colors

A three-ink palette: emerald ground, gold ink, cream text, with mist for quieter copy and an ivory register for transactions.

### Primary
- **Pouch Gold Ink** (gold-ink): the brand's working gold. Italic heading accents, icons, the primary button fill, the 2px pack-panel frame, the focus ring, text selection, and every hairline rule at reduced opacity (15% for section dividers, 20% for panel borders, 25-35% for list rules).
- **Polished Gold** (gold-light): hover state of the primary button, link text, secondary gold copy such as price figures and taglines.
- **Pale Leaf Gold** (gold-pale) and **Gold Cream** (gold-cream): outline-button text, chip text, and the brightest stop of the foil and honey gradients.
- **Pressed Gold** (gold-pressed): active state of the primary button and the base of the honey fill.

### Neutral
- **Emerald Night** (emerald-ground): the page ground for every customer page, the navbar, and dark text on gold.
- **Raised Emerald** (emerald-raised): one step up, for panels, product cards, the footer, alternating full-bleed sections, honeycomb cells and the pack-panel value cells.
- **Image-Well Emerald** (emerald-well): behind product images and as the scrollbar thumb; never a third panel tier.
- **Pouch Cream** (cream): primary text and display headings on emerald.
- **Sage Mist** (mist): secondary body text, captions, footer links, local ingredient names.
- **Mint Note** (mint-note): small positive notes on product cards (e.g. savings) only.

### Transactional register
- **Ivory Paper** (ivory): ground of Cart, Checkout, Profile, Orders and Terms.
- **Forest Ink** (forest-ink) / **Deep Forest** (forest-ink-deep): headings, primary buttons and their hover on ivory.

### Named Rules
**The Gold Is Ink Rule.** Gold is applied as text, strokes, 1px rules, icons and the primary button fill. It is never a glow, a wash, or a gradient over a surface. The two gradient exceptions are native to the world and fixed: the gold foil on the "Devanagari" wordmark (navbar LickingWordmark, and the incumbent Contact page), and the honey that rises into a highlighted honeycomb cell.

**The Two Steps of Emerald Rule.** A dark page uses emerald-ground and emerald-raised, nothing else for surfaces. If a third level seems needed, use a gold rule instead.

## Typography

**Display Font:** Fraunces (with Georgia, serif), optical sizing on, default weight 350
**Body Font:** Figtree (with system-ui, sans-serif), weights 400-700

**Character:** Fraunces at light weights gives a soft, old-recipe warmth with a modern optical-size cut; its italic carries the gold accent. Figtree is plain and friendly, so prices, ingredients and forms stay effortless for every age.

### Hierarchy
- **Display** (300, 3rem mobile rising to 4.25-5.5rem, line-height 1.0-1.02, -0.025em): page-opening h1 only. One phrase turns gold italic.
- **Headline** (350, 2.25rem rising to 3rem, line-height 1.08): section h2s, usually paired with a mist paragraph in the opposite columns of a 12-column row.
- **Title** (350, 1.5rem): card names, benefit titles, step titles, footer column heads in gold-light.
- **Body** (400, 17px, line-height 1.7, max ~34rem): lead paragraphs in mist, emphasis in cream semibold.
- **Body small** (400, 15px, line-height 1.6-1.7): card copy, lists, contact lines.
- **Label** (700, 13px, 0.06em, uppercase): the gold label cells of the About pack panel only.

### Named Rules
**The Single Gold Turn Rule.** Each display or headline heading turns into gold italic once, on its key phrase ("Rooted in", "Us More", "Health Mix"). Never two gold phrases in one heading, never gold italic in body copy.

**The Tabular Figures Rule.** Prices, counts, FSSAI numbers, phone numbers and honeycomb indices use tabular numerals.

## Layout

Content sits in a centered 80rem container with 20px gutters on phones and 32px from 640px up. Sections breathe at 96px vertical padding, 128px on large screens, divided by full-width gold hairlines (15%) or by switching to the raised emerald for a full-bleed band. Section intros use a 12-column split: headline in columns 1-6, mist paragraph in columns 8-12, aligned to the bottom. The fixed navbar is 96px tall on mobile; every page starts with 96px top padding to clear it.

Product grids run 1, 2, then 3 columns with 24-32px gaps. The About page uses a fixed 22rem heading column beside its pack panel on large screens; the panel's rows are a 12.5rem label column plus value, collapsing on phones to a gold label band stacked above its value.

## Elevation & Depth

The dark world is flat. Depth comes from tone (ground to raised emerald) and from hairline gold borders, never from shadows, blur or glass. Image hover is a gentle 1.03 scale inside its frame, not a lift.

### Shadow Vocabulary
- **Floating menu** (`box-shadow: 0 12px 32px -8px rgba(0,0,0,0.5)`): the navbar user dropdown only, because it overlaps content.

### Named Rules
**The One Border Rule.** A surface is defined by one border and one tone step. If it needs a shadow to separate from the ground, it is not a dark-world surface; floating menus are the only exception.

## Shapes

Actions are pills (full radius): primary, outline, quantity steppers, icon buttons, the cart count and sale badges. Containers are softly rounded at 14px (panels, product cards, the pack panel); process images use 12px; certification chips use 8px. The hero product photo is a circle framed by a 1px gold ring and set inside the 400-unit rangoli, which slowly turns (240s). The ingredient honeycomb uses pointy-top hexagons with a 1px gold edge, rows interlocking by a quarter of their height. Gold rules are always 1px, except the 2px frame of the About pack panel.

## Components

### Buttons
- **Shape:** full pill.
- **Primary (gold):** solid gold-ink fill, emerald-ground text, Figtree 14-15px semibold, 12px by 24px padding (hero size 14px by 28px), optional leading line icon and a trailing arrow that nudges 4px right on hover.
- **Hover / Active:** fill lightens to gold-light, presses to gold-pressed; 200ms color transition. Focus: 2px gold-ink outline, 3px offset (global).
- **Outline:** transparent, 1px gold-ink border at 60%, gold-pale text; hover brightens the border and adds a 10% gold tint.
- **Text link:** gold-light semibold with a 40% gold underline at 6px offset, paired with an arrow.
- **Ivory register:** forest-ink fill, ivory text, 8px corners, deepening to forest-ink-deep on hover; outline variant uses a 2px forest-ink border.

### Chips
- **Certification chip:** 8px corners, 1px gold-ink border at 70%, gold-pale semibold 14px text.
- **Badge:** gold-ink pill with emerald text, 12px semibold, for sale tags and the cart count (with a 2px emerald ring).

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** emerald-raised; image wells in emerald-well.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px gold-ink at 20%, rising to 45% on hover for product cards.
- **Internal Padding:** 24px for product cards, 32px for message panels.

### Inputs / Fields
- **Style:** underline-only on dark: transparent, a 1px gold-ink bottom rule at 30%, cream text, mist placeholder, 12px vertical padding.
- **Focus:** the rule brightens to gold-light; no ring, no glow.

### Navigation
- Fixed emerald-ground bar with a gold hairline bottom border that strengthens from 15% to 25% after 50px of scroll. Links in cream, gold on hover; cart and account as circular icon buttons with a 10% gold hover tint. On mobile the home route shows the licking wordmark; inner routes show a gold "Home" back link. The user dropdown is an emerald-raised menu with a 20% gold border and the floating-menu shadow.

### Licking Wordmark (signature)
"Devanagari" set in Fraunces light italic with the gold foil gradient, and under it an SVG gold crescent smile that draws in from the left, then on a 5.2s cycle lets a milk drop fall, catches it on a tongue that curls up to lick, grins, and throws gold sparkles. Plays once on mount, on hover and periodically; respects reduced motion. Lives in the navbar.

### Rangoli (signature)
Exact-geometry gold line rangoli (lotus petals, scallops, curls, eight-point stars) drawn stroke by stroke like chalk, dots popping in after, then a slow 240s turn. Frames the circular hero product photo at 60% gold; smaller section rangoli sit half off-canvas behind section edges.

### Ingredient Honeycomb (signature)
The 21 ingredients as pointy-top hexagons: tabular gold index, Fraunces name in cream, local name in mist. The highlighted cell fills with honey rising from the bottom and its text turns emerald-ground.

### Pack Panel (signature, About)
The back-of-pack information table: 2px gold-ink frame, 14px corners, emerald-raised body, rows split by 1px gold rules at 35%. Each row's gold label cell prints in left to right in sequence (0.6s, 0.1s stagger) and its value fades up behind it; values are Fraunces light or Figtree in cream, with mist and gold-light for secondary lines.

## Do's and Don'ts

### Do:
- **Do** keep every dark page on emerald-ground with emerald-raised as the only surface step.
- **Do** separate sections and rows with 1px gold-ink rules at 15-35% opacity.
- **Do** give each heading exactly one gold italic phrase.
- **Do** use pill shapes for actions and 14px corners for containers.
- **Do** animate entrances with cubic-bezier(0.25, 1, 0.5, 1) and let reduced motion show the finished state.
- **Do** put Cart, Checkout, Profile, Orders and Terms on the ivory register with forest-ink.

### Don't:
- **Don't** add drop shadows, blur, glass or glows to dark-world surfaces; the floating menu shadow is the only one.
- **Don't** apply the gold foil gradient to any new text; it belongs to the "Devanagari" wordmark.
- **Don't** put small uppercase tracked eyebrows above headings; uppercase tracked text is reserved for the pack-panel label cells.
- **Don't** introduce a third emerald surface tier or a new accent hue.
- **Don't** set body copy, form labels or button text in Fraunces; those are Figtree.
