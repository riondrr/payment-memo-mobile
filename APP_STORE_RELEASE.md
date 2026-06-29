# App Store release setup

The current app is a local-first PWA. Publishing a native iOS app with login,
cloud sync, ads, and a paid account limit requires a native wrapper and the
external configuration below.

## Product rules

- A free user can register up to 3 accounts.
- A one-time, non-consumable StoreKit purchase unlocks unlimited accounts.
- The iOS app can show an AdMob anchored adaptive banner ad.
- Rewarded video ads, if added, use a separate ad provider from AdMob.
- Do not unlock account slots by requiring a rewarded video view in the iOS
  app.

The account limit must be enforced by the database as well as the UI. The
initial schema in `supabase-schema.sql` rejects an insert after the free limit
is reached unless the verified profile entitlement is unlimited.

## Important App Store constraints

Apple requires in-app purchase when an app unlocks digital features. Configure
the unlimited-accounts item as a non-consumable in-app purchase in App Store
Connect and implement purchase restoration.

Do not grant an extra account slot in exchange for watching an ad in the iOS
build. An account slot changes app functionality, and App Review Guideline
3.1.4 says users may not be required to engage in advertising or marketing
activities to unlock app functionality. Use a normal banner ad instead.

If users can create an account, the app must also include an account deletion
action. It should delete the Supabase Auth user and associated application data.

References:

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/documentation/storekit/in-app-purchase
- https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/

## Hosting

Supabase can provide authentication, Postgres storage, and Edge Functions on
its Free plan while usage stays within its current quotas. Free projects may be
paused after one week of inactivity, so monitor the project before and after
release.

Vercel Hobby is suitable for personal, non-commercial testing only. Do not use
the Hobby plan for a released app that earns ad or purchase revenue.

For this app, use Cloudflare Pages Free for the production static assets.
Cloudflare's self-serve agreement supports customers acting for an entity and
does not limit the Free Service to personal, non-commercial use. Cloudflare
Pages static asset requests are currently free and unlimited. The Pages Free
plan currently allows 500 builds per month and 20,000 files per site.

Firebase Hosting is another commercial-use option with a no-cost allowance,
but Cloudflare Pages is a simpler fit for the current static files.

Use Vercel Pro instead only if Vercel-specific features become necessary.

The app is static, so Supabase handles the backend and the host only serves the
web assets used by the PWA or native wrapper.

References:

- https://supabase.com/pricing
- https://vercel.com/docs/accounts/plans/hobby
- https://www.cloudflare.com/terms/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans

## Supabase setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Add the project URL and publishable key to the native build configuration.
4. Use Supabase Auth for login. Email magic link is enough for an initial
   release. Sign in with Apple is also supported by Supabase Auth.
5. Sync accounts and monthly payments through the Supabase client with the
   authenticated user's access token. Row Level Security isolates each user's
   rows.
6. Implement account deletion through a server-side Edge Function. Never put a
   Supabase secret key in the web bundle or native client.

References:

- https://supabase.com/docs/guides/auth/
- https://supabase.com/docs/guides/auth/auth-apple
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/functions/auth

## StoreKit purchase

Create a non-consumable App Store Connect product, for example:

`com.example.paymentnotes.unlimited_accounts`

After purchase or restore:

1. Read the verified StoreKit transaction in the native iOS layer.
2. Send the signed transaction to a Supabase Edge Function.
3. Verify the transaction server-side.
4. Store the transaction in `purchase_events`.
5. Set `profiles.unlimited_accounts = true`.

Only the trusted server path may update the entitlement. The client must not
write `profiles.unlimited_accounts` directly.

## AdMob

Integrate Google Mobile Ads SDK in the native iOS layer for banner ads. AdMob
cannot be added to the PWA as a web script.

Use an anchored adaptive banner at the bottom of the screen. During development
use Google's iOS banner test ad unit:

`ca-app-pub-3940256099942544/2435281174`

If rewarded video ads are added, integrate them through a separate provider.
Keep them optional and separate from the account limit. Before selecting that
provider, review its current iOS SDK, consent flow, privacy disclosures, age
rating impact, and App Store compliance.

Changing the rewarded video provider does not make account-slot rewards
acceptable for the iOS build. App Review Guideline 3.1.4 applies to requiring
advertising or marketing activities to unlock app functionality, regardless of
the ad provider.

Before requesting ads, implement the User Messaging Platform consent flow and
check whether ads can be requested. If App Tracking Transparency is used,
configure its purpose string and request flow before loading personalized ads.

References:

- https://developers.google.com/admob/ios/banner
- https://developers.google.com/admob/ios/privacy
- https://developers.google.com/admob/ios/privacy/strategies

## Native work still required

The repository does not yet contain an iOS project. Before App Store release:

1. Add a native iOS shell or cross-platform wrapper.
2. Refactor payment methods into a first-class accounts collection so the
   3-account rule can be applied consistently.
3. Add Supabase login, sync, account deletion, and offline conflict handling.
4. Add StoreKit purchase and restore flows.
5. Add AdMob banner display, privacy consent, and App Store privacy metadata.
6. Enroll in the Apple Developer Program and prepare App Store review notes.

Publishing on the App Store requires an Apple Developer Program membership,
currently listed by Apple as 99 USD per membership year.

Reference:

- https://developer.apple.com/support/compare-memberships/
