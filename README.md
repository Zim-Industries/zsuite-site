# Z-Suite marketing site

A static, buyer-focused presentation site, separate from the private Z-Suite application.

**Preview:** https://zim-industries.github.io/zsuite-site/

## Current publication posture

- Publicly reachable internal-review preview. `noindex, nofollow` discourages search indexing; it is **not authentication or privacy protection**.
- No contact forms, booking links, analytics, cookies, application sign-in, or staging access links.
- Only marketing-safe content, supplied brand assets, self-hosted Inter fonts and the customer-facing capability PDF are published.
- The page is a marketing presentation, not a product instance. The hero is an explicitly labeled workflow illustration, not a screenshot.

## Edit and preview

The publishable site lives in `docs/`. It needs no build step or runtime dependencies.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs
```

Open http://127.0.0.1:8765/.

- `docs/index.html`: product story, current scope, buyer-fit questions and download links.
- `docs/styles.css`: responsive layout and brand tokens.
- `docs/site.js`: progressive mobile navigation and keyboard-accessible workflow tabs.
- `docs/downloads/`: approved customer-facing downloads only.
- `docs/assets/LICENSE.txt`: Inter font license. Z-Suite brand artwork is supplied by the owner; no rights to third-party use are granted by this repository.

## Verification

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Tests cover publication boundaries and local links, the PDF response, mobile navigation, keyboard tabs, native FAQ disclosure, JavaScript-disabled reading, responsive layouts and automated accessibility scans at 320, 390, 820 and 1440 CSS pixels. Automated scans are not comprehensive accessibility certification. Screenshots are generated in the ignored `review/` directory.

## Deployment

GitHub Pages uses Actions. A push to `main` runs the static checks and browser suite, uploads **only `docs/`**, and deploys after verification succeeds. Pull requests run verification without deployment. No private application source or repository credentials are needed at runtime. The workflow does not interpolate untrusted event text into shell commands; deploy permissions are isolated to the deployment job.

## Copy and commercial claims

The initial content is based on the reviewed October 27, 2026 capability baseline and matching capability guide. Delivery means implemented scope, not automatic availability in every deployment. Keep configuration prerequisites, read-only boundaries and payroll/offline limitations accurate. Do not add customer logos, testimonials, savings statistics, certification claims, prices, dates or feature availability without supporting approval and evidence.

Planned work is separated from delivered scope and carries no release-date promise. Review the page and replace the guide together when product scope changes. Before a public marketing launch, approve final copy, review search/indexing posture, select a domain and decide whether to add contact details or a lead flow. None is configured in this preview.
