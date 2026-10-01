# CLAUDE.md

## Who the user is
- Owner of **Core Innovation** (website: https://ci-eg.com), a design & build company:
  interior design, fit-out, furniture, construction. Founded Cairo 2017, Riyadh branch 2024.
- Speaks Egyptian Arabic; reply in Egyptian Arabic.
- Works with Claude as a graphic designer / brand consultant.

## Important: don't confuse the two brands
- "The logo" / "my logo" = the **Core Innovation** logo on ci-eg.com, NOT this app.
- This repo (`app/`, Next.js + Supabase) is a separate product called **ميزان (Mizan)**,
  a finishing-projects money tracker. Its "logo" is just the word ميزان in Cairo 800.

## Core Innovation brand (as found on ci-eg.com, Oct 2026)
- Header logo: `brand/current/header-logo.png` (852x442 PNG, transparent).
  Symbol = white open "C" > ring "O" > black disc with lowercase "re" (C-O-re nested),
  circular text "INNOVATION BEGINS AT THE CORE", gold wordmark CORE + tagline
  "Innovation Begins at the Core" under it.
- Light version (user-supplied, 1080x1080 canvas, cropped): `brand/current/logo-light.png`.
  Gold C, black ring, gold "re", black circular text and black tagline, gold CORE.
  Logo fills only ~13% of the 1080 canvas.
- Favicon: `brand/current/favicon-270.png`, a different mark (nested square C/r/E maze),
  black at 50% opacity.
- Colors (Elementor kit): primary gold `#DAA14C`, secondary/accent charcoal `#30373E`,
  dark `#202020`, text `#535353`, highlight `#E56D6D`. Font: Poppins (site-wide).
- Gold on white contrast is only 2.3:1; proposed dark gold `#96661F` (5:1) for small text.

## Logo review done (2026-10-01)
- Full review page: `brand/logo-review.html`
  (published: https://claude.ai/artifact/KogoR1dSSuetxM94pJxoSP).
- Main weaknesses: tagline written twice; circular text unreadable and upside-down at
  bottom; two unrelated symbols (circle vs square favicon); colors swap between dark and light
  versions (no fixed-color element); header PNG has a white symbol that vanishes on light
  backgrounds; "re" in a different style than CORE; no Arabic version (needed for Riyadh);
  raster PNG only; "Innovation" lost from the wordmark.
- Directions proposed:
  - **A (recommended)**: refine the circle: open C + thin ring + gold core dot, no circular
    text, lockup CORE / I N N O V A T I O N in Montserrat 800/600.
  - **B**: grow the favicon idea: nested square C's like a floor plan, gold square core.
  - **C**: wordmark only, the O of CORE becomes a ring with a gold dot.
  - Plus Arabic lockup "كور إنوفيشن" in Alexandria.
- Next step waiting on the user: pick a direction, then deliver final SVGs
  (horizontal, symbol only, Arabic, one-color) + favicon sizes for WordPress.

## Brand identity proposal with the CURRENT logo, unchanged (2026-10-01)
- User asked first to see a full identity using the logo as-is (no logo edits).
- Page: `brand/identity/identity.html` (published: https://claude.ai/artifact/Vt2FMyMGQcHkLRorE4fFJx).
  Logo crops in `brand/identity/` (logo-dark, logo-light, symbol-dark, symbol-light PNGs).
- System: colors Gold #DAA14C, Night #202020, Charcoal #30373E + supporting Stone #EEEBE5
  and Deep Gold #96661F; ratio Night 50 / Stone-White 25 / Charcoal 15 / Gold 10.
  Type: Poppins (EN, matches site), Alexandria (AR headings), IBM Plex Sans Arabic (AR body).
  Graphic device: the open "C" arc from the logo (big cropped arc, thin double-arc frame,
  C+dot pattern). Clear space x = diameter of the inner "re" disc; min size 35mm/140px,
  symbol alone 12mm/32px. One-color black/white versions made with CSS masks.
- Applications shown: business card, letterhead, DL envelope, quotation cover, IG posts
  (project / quote / 60+ stat), story (Riyadh branch), LinkedIn cover, email signature,
  website header, site hoarding, van, Riyadh office sign (Arabic name as a separate line
  under the logo), furniture hang tag.
- Next: if approved, produce print-ready files; need the original vector logo (AI/PDF/SVG).
