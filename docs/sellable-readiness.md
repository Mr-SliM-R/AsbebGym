# Gym Rival Sellable MVP Readiness

## Implemented

- Account signup and password login.
- Demo login for the original seeded rivalry.
- Organization/group model with member accounts.
- Invite-link generation for group admins.
- Business setup page for members, invites, billing status, privacy controls, and beta proof.
- Stripe checkout integration point with environment-key checks.
- PWA manifest, service worker, and install support.
- Offline workout draft persistence in local storage.
- Account data export and delete endpoints.
- Legal readiness page for privacy, terms, and media-rights baseline language.
- Full exercise-guide image coverage for all 40 exercises.

## Required Before Charging Customers

- Set a strong `AUTH_SECRET` in production.
- Add real email delivery for invite links.
- Connect `/api/business/:userId/billing/checkout` to Stripe Checkout using:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_ID`
  - production success/cancel URLs
- Replace any temporary reused exercise guide assets with exercise-specific final images.
- Have a lawyer review the privacy policy, terms, and training disclaimer.
- Run a beta with 3-5 groups and track:
  - weekly active members
  - workouts per active member
  - invite conversion
  - willingness to pay

## Current Beta Success Criteria

- 3-5 active groups.
- At least 60% weekly active members.
- At least 2 workouts per user per week.
- Clear willingness to pay from at least 2 group owners.
