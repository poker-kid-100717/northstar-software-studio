# Cloudflare Pages deployment — Northstar Software Studio

Deploy the public Angular storefront first. Do **not** enable payments until the API, PostgreSQL, Stripe webhook, and domain configuration are live and tested.

## Connect GitHub to Cloudflare Pages
1. Sign in at https://dash.cloudflare.com/ and open **Workers & Pages**.
2. Choose **Create application** → **Pages** → **Connect to Git** (wording may vary).
3. Authorize GitHub and select `poker-kid-100717/northstar-software-studio`.
4. Set production branch to `main`.
5. Use these build settings:
   - Framework: **Angular** (or None if the Angular preset does not match)
   - Root directory: `web`
   - Build command: `npm ci && npm run build -- --configuration production`
   - Build output directory: `dist/northstar/browser`
6. Deploy. Cloudflare assigns a `*.pages.dev` URL. Visit the homepage and check the browser console.
7. Set a custom domain later if desired.

## Important launch constraints
- The storefront currently requests `/api/instant-fixes` from the same origin. Cloudflare Pages does **not** host the ASP.NET Core API or PostgreSQL database automatically.
- Until a production API is deployed and routed to `/api/*`, the product catalog, product details, and intake workflow will not work.
- Never configure a Stripe live secret, webhook signing secret, or database connection string in a public Angular build.
- Keep `Payments:TestEnabled=false` and all product `PaymentEligible=false` until end-to-end payment testing is completed.
- Do not advertise the public site as accepting orders until the backend and checkout are operational.
- Stripe account activation may require a working site with service descriptions, contact information, and refund/cancellation policies.
