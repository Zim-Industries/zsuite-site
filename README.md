# Z-Suite product presentation

A static product presentation for the internal, first-party Z-Suite application, separate from the private application repository.

**Preview:** https://zim-industries.github.io/zsuite-site/

## Current publication posture

- Publicly reachable internal-review preview. `noindex, nofollow` discourages search indexing; it is **not authentication or privacy protection**.
- No contact forms, booking links, analytics, cookies, application sign-in, or staging access links.
- Only marketing-safe content, supplied brand assets, self-hosted Inter fonts and the customer-facing capability PDF are published.
- The page is an internal product presentation, not a product instance. The hero is an explicitly labeled workflow illustration, not a screenshot.

## Edit and preview

The publishable site lives in `docs/`. It needs no build step or runtime dependencies.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs
```

Open http://127.0.0.1:8765/.

- `docs/index.html`: product workflows, current scope, planned direction and download links.
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

## Product copy and capability claims

The current content and matching 10-page capability guide are reviewed through October 28, 2026, pinned to application main `0aab7a9c8a24b80325bb28f1b45eb3414d44048a`. This refresh moves existing daily-JSA Office review/reporting and connected asset/conditions scope out of the roadmap, based on merged implementation and source verification; no new roadmap themes were added. Native/offline architecture acceptance is not implementation. NWS/AirNow lookup remains setup/coverage-limited, and the first key-enabled AirNow deployment needs live validation.

Delivery means implemented scope, not automatic availability in every deployment. Keep configuration prerequisites, read-only boundaries and payroll/offline limitations accurate. Do not add customer logos, testimonials, savings statistics, certification claims, prices, dates or feature availability without supporting approval and evidence.

Write about the product and its workflows in a factual, product-centered voice. This is an internal pitch for a first-party application, not a sales or purchase-evaluation page: avoid buyer qualification, purchasing advice, customer-conversion language and first-person promises such as “we will be able to.” Describe implemented capabilities in the present tense and planned direction explicitly as planned. Preserve material scope and setup limits without framing them as purchasing warnings.

Planned work is separated from delivered scope and carries no release-date promise. Review the page and guide together when product scope changes. This copy-only revision does not change the existing downloadable guide, feature status, application behavior or in-progress showcase work.
