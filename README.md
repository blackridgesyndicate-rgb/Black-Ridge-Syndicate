# Black Ridge Syndicate — Website

A static 5-page roofing website: `index.html`, `residential.html`, `commercial.html`, `about.html`, `contact.html`, sharing `css/style.css` and `js/main.js`. The hero's animated ridge/embers scene is powered by Three.js in `js/three-hero.js` (loaded from a CDN — no build step needed).

## Before launch, update:

- **Phone / email** — currently placeholder `(555) 123-4567` and `info@blackridgesyndicate.com` in every page's header and footer.
- **Service area** — "Serving the Greater Region & Surrounding Counties" in the footer/contact page; replace with your actual cities/counties.
- **Photos** — the gallery, "why us," and materials sections use styled placeholder panels (`.g-pattern` / `.split-media`) instead of real photography. Swap in project photos for a stronger impression.
- **Testimonials** — the three quotes on the homepage are sample placeholders; replace with real client reviews.
- **Contact form** — `contact.html`'s form (`#quote-form`) currently only shows a client-side success message (see `js/main.js`). Wire it to Wix Forms, Formspree, Netlify Forms, or your CRM to actually receive leads.
- **Social links** — footer social icons currently point to `#`.

## Running locally

No build step — just serve the folder statically, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
