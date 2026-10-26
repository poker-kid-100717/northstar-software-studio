# Pull request validation

The GitHub Actions workflow `.github/workflows/validate.yml` runs a .NET 10 Release build and an Angular production build on pull requests and main pushes.

A green CI run means the projects compile, **not** that checkout, authentication, or customer workflows have been verified. Stripe payments remain disabled. For local verification, run `docker compose up -d postgres`, configure `ConnectionStrings__Northstar`, run the API, and run `npm start` from `web`.

Do not enable payment collection until migrations, webhook signature checks, idempotency, capacity reservations, private files, and admin authentication have automated tests.
