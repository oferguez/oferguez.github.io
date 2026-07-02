# Green Paprika PageSpeed Fix Plan

Source report: [PageSpeedInsights.pdf](/home/ofer/wsl_repos/landing/tests/PageSpeedInsights.pdf)

Report snapshot from 11 May 2026 15:58 BST for `https://green-paprika.com/`

- Performance: 78
- Accessibility: 100
- Best Practices: 96
- SEO: 92

## Priority Order

1. Fix the `404` response on the Green Paprika landing URL.
2. Cut image weight and define image dimensions.
3. Add long-lived caching for static assets.
4. Reduce JS and render-blocking work on the landing page.
5. Fix console errors and missing security headers.
6. Re-test and only then optimize smaller residual issues.

## Priority 0: Crawlability Blocker

### Problem

The report shows `Page has unsuccessful HTTP status code — 404`.

This is the highest-priority issue because it can prevent indexing entirely. The current repo uses a React SPA route for Green Paprika, and the page title, description, and canonical are set at runtime in `src/components/GreenPaprikaJVSEvent.jsx`. That is fragile for SEO and consistent with the `404` result seen in Lighthouse.

### Required Fix

Serve the Green Paprika landing page as a real HTML document that returns `200` on the canonical URL.

### Recommended Implementation

Option A: best fit if staying on the current static hosting setup

- Create a real static page at `public/green-paprika/index.html`.
- Move the critical Green Paprika landing content into that static file.
- Include server-visible `<title>`, `<meta name="description">`, and `<link rel="canonical">` directly in the HTML.
- Keep asset paths absolute and stable.
- Update `public/sitemap.xml` to include the exact canonical URL that returns `200`.
- Verify `robots.txt` still points to the correct sitemap.

Option B: better longer-term architecture

- Move the site to a host that supports rewrites or SSR/prerendering such as Netlify, Vercel, or Cloudflare Pages.
- Prerender the Green Paprika route so the response body and metadata are available in the initial HTML with `200`.

### Acceptance Criteria

- `curl -I https://green-paprika.com/` returns `200`.
- The HTML response contains the Green Paprika title, description, and canonical before JS runs.
- Lighthouse SEO no longer reports unsuccessful HTTP status code.

## Priority 1: Image Delivery

### Problems

- `Improve image delivery — Est savings 2,847 KiB`
- `Avoid enormous network payloads — Total size was 3,241 KiB`
- `Image elements do not have explicit width and height`

### Required Fixes

- Compress and resize the flyer image at `/green-paprika/jvs_event_files/JVS_Event_Flyer.png`.
- Prefer `webp` or optimized `jpg` when visual quality allows.
- Deliver an appropriately sized image for the landing layout rather than the original full-resolution asset.
- Add explicit `width` and `height` on the main `<img>` element.
- Consider `srcset` and `sizes` if the page needs multiple responsive variants.

### Implementation Steps

- Inspect the actual rendered dimensions of the flyer in the landing layout.
- Export 1 or 2 optimized variants close to the rendered size.
- Replace the current PNG if its weight is materially larger than necessary.
- Add `width`, `height`, and `loading` attributes where appropriate.
- Re-run Lighthouse and confirm the payload drops sharply.

### Acceptance Criteria

- Main landing image transfer size is reduced substantially.
- Lighthouse no longer flags missing image dimensions.
- Total page payload drops well below the current `3,241 KiB`.

## Priority 2: Static Asset Caching

### Problem

`Use efficient cache lifetimes — Est savings 2,716 KiB`

### Required Fix

Serve versioned assets with long cache lifetimes.

### Implementation Steps

- Confirm how the current host sets cache headers for:
  - built JS/CSS under `dist/assets`
  - images under `public/green-paprika`
- Keep hashed asset filenames for JS/CSS.
- For landing-page images, either:
  - move them into hashed build output, or
  - configure the host to send long-lived cache headers for immutable static assets.
- Ensure the HTML document itself remains short-lived while static assets are cacheable.

### Acceptance Criteria

- Large static assets return cache headers suitable for long-term reuse.
- Repeat PageSpeed runs no longer flag cache lifetime as a major opportunity.

## Priority 3: Reduce JS and Render Blocking

### Problems

- `Reduce unused JavaScript — Est savings 165 KiB`
- `Render blocking requests — Est savings 90 ms`
- `Avoid long main-thread tasks — 2 long tasks found`

### Required Fixes

- Stop sending the full SPA payload to the Green Paprika landing page if the page is primarily marketing content.
- Reduce CSS/JS needed for first render.

### Implementation Steps

If using a static landing page:

- Remove React from the main Green Paprika landing path entirely.
- Keep interactive features minimal and inline only what is needed.
- Load non-critical scripts after first render.

If keeping the page in React:

- Split the route bundle aggressively.
- Remove unused dependencies from the route.
- Audit route-specific CSS and shared app code for unused weight.

### Acceptance Criteria

- Lower JS transferred on the Green Paprika page.
- Fewer or no long tasks on initial load.
- Performance score improves beyond the current `78`.

## Priority 4: Console Errors and Response Diagnostics

### Problems

- `Browser errors were logged to the console`
- `Document request latency — Error!`

### Required Fixes

- Reproduce the page locally and in production with browser devtools open.
- Fix all console errors on initial page load.
- Check for failed requests, bad redirects, or third-party resource delays affecting the document request.

### Implementation Steps

- Load `https://green-paprika.com/` in a clean browser session.
- Capture console output and network failures.
- Fix broken resource references first.
- Confirm there are no misconfigured redirects or error-document fallbacks on the host.

### Acceptance Criteria

- No console errors on first load.
- No failed critical requests for the landing page.

## Priority 5: Security / Best Practices Cleanup

### Problems

Manual best-practice checks in the report call out missing or unverified protections:

- CSP
- HSTS
- COOP
- XFO or CSP anti-clickjacking
- Trusted Types

### Required Fixes

- Add security headers at the host level where supported.
- At minimum, define:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Frame-Options` or equivalent CSP `frame-ancestors`
  - `Cross-Origin-Opener-Policy`

### Note

These matter, but they are below the crawlability and payload fixes in priority because they are not the primary reason the landing page underperforms in search.

## Delivery Sequence

### Phase 1

- Make Green Paprika a real `200` HTML landing page.
- Align canonical and sitemap with that exact URL.
- Re-test Lighthouse SEO.

### Phase 2

- Optimize flyer and other landing assets.
- Add explicit image dimensions.
- Re-test performance.

### Phase 3

- Add caching rules for immutable assets.
- Reduce JS/CSS on the landing path.
- Re-test performance and best practices.

### Phase 4

- Fix remaining console errors.
- Add security headers.
- Run a final validation pass.

## Suggested Validation Checklist

- `curl -I` on the canonical Green Paprika URL returns `200`.
- View-source on the canonical URL contains final title, description, and canonical.
- Lighthouse no longer reports `404`.
- Page weight is materially lower than the current report.
- Main image has explicit dimensions.
- Static assets have cache headers.
- No console errors on first load.

## Recommendation

Do not spend time tuning small Lighthouse opportunities until the Green Paprika page is served as a real `200` HTML document. The current `404` status is the one issue most likely to break crawling and nullify the SEO work already added in React.
