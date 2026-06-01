# App Store release setup

The current app is a GitHub Pages PWA. The following external configuration is
required before enabling account sync or publishing a native App Store build.

## Cloud sync

Use Firebase Authentication and Cloud Firestore so data can be restored after
the app is removed and shared across devices.

Required values:

- Firebase web app configuration
- Firebase project ID
- Google OAuth web client ID
- Firestore security rules scoped to the authenticated user's UID

Google setup:

- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/manage-data/enable-offline

## Sign in with Apple

Apple web authentication requires an Apple Developer Program membership, a
primary App ID with Sign in with Apple enabled, and a Services ID associated
with the published website domain.

Apple setup:

- https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web
- https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple

## Ads

For the future native iOS build, use Google AdMob anchored adaptive banner ads
at the bottom of the screen. Use Google's test ad unit while developing, then
replace it with the production AdMob banner unit before release.

- https://developers.google.com/admob/ios/banner

The PWA does not load a live ad until an appropriate web ad publisher ID and
slot are supplied. Native AdMob must be integrated in the iOS wrapper rather
than embedded as a web script.
