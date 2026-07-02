Green Paprika SEO Notes

Completed

1. Visible on-page copy improved in `src/components/GreenPaprikaJVSEvent.jsx`.
   - Added stronger keyword coverage for:
     - London
     - vegan
     - Hungarian
     - pop-up
     - popup
     - takeaway
   - Kept wording aligned with the actual business:
     - Green Paprika is not limited to North London
     - takeaway is mentioned, not only pop-up events
     - only the specific June 2 event is location-specific

2. Route-specific page title added for `/green-paprika`.
   - Current title:
     `Green Paprika | London Vegan Hungarian Pop-Up & Takeaway`
   - Implemented in `src/components/GreenPaprikaJVSEvent.jsx`

3. Route-specific meta description added for `/green-paprika`.
   - Implemented in `src/components/GreenPaprikaJVSEvent.jsx`
   - The route now sets:
     `Green Paprika is a London vegan Hungarian pop-up and takeaway kitchen offering plant-based Hungarian food through supper events, popup collaborations, and takeaway across London.`

4. Meta description handling made self-contained.
   - If a `<meta name="description">` tag does not already exist, the route creates it.
   - On route exit, it restores the previous value or removes the tag if it created it.

5. Canonical URL added for the main Green Paprika page only.
   - Canonical:
     `https://green-paprika.com/`
   - Implemented in `src/components/GreenPaprikaJVSEvent.jsx`

6. Canonical handling made self-contained.
   - If a canonical link does not already exist, the route creates it.
   - On route exit, it restores the previous value or removes the tag if it created it.

7. Sitemap added.
   - File: `public/sitemap.xml`
   - Currently includes only:
     `https://green-paprika.com/`
   - The archive page is intentionally not included for now.

8. Robots file added.
   - File: `public/robots.txt`
   - Allows crawling
   - Points search engines to:
     `https://green-paprika.com/sitemap.xml`


Not Done Yet / Remaining

1. Stronger SEO delivery via prerendered or static HTML.
   - Current title, description, and canonical are applied by React at runtime.
   - Many crawlers will read them, but prerendered HTML is stronger and more reliable.
   - Future improvement:
     - prerender `/green-paprika`
     - or generate a dedicated static HTML page for this route

2. Decide whether the archive page should be indexed.
   - Current status:
     - archive remains accessible
     - archive is not in the sitemap
     - archive has no special canonical/noindex handling
   - Future options:
     - leave as-is
     - add `noindex`
     - add canonical if business goals change

3. Optional: improve internal linking.
   - Add more descriptive internal links from other pages using phrases like:
     - London vegan Hungarian pop-up
     - Green Paprika takeaway
     - Hungarian vegan supper in London

4. Optional: add structured data.
   - Event schema for the June 2 supper
   - Organization / LocalBusiness-style schema if relevant
   - This is not required for the current baseline SEO work

5. Optional: refine title and meta description over time.
   - Once the page is live for a while, adjust wording based on actual search/query behavior.


Current SEO Focus

The main page is the preferred landing page for search.
The archive page is secondary and intentionally not being promoted.
