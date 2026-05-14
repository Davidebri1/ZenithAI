# Zenith — Submission Guide

Step-by-step from zero to live on both stores.

---

## Step 1: Apple Developer Enrollment

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your personal Apple ID
3. Choose "Individual" (not Company, unless you have a DUNS number)
4. Pay $99/year
5. Wait for approval (usually instant, sometimes 24–48 hours)

After enrollment you'll get:
- Your **Apple ID** (the email you used)
- Your **Apple Team ID** — find it at https://developer.apple.com/account → Membership Details

---

## Step 2: Create the App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. My Apps → "+" → New App
3. Fill in:
   - Platform: iOS
   - Name: **Zenith**
   - Primary Language: English (U.S.)
   - Bundle ID: **com.dreamtop.zenith** (create this in Apple Developer portal first)
   - SKU: **zenith-001**
4. After creating the app, copy the **App Store Connect App ID** from the URL
   (e.g. `https://appstoreconnect.apple.com/apps/1234567890/...` → ID is `1234567890`)

---

## Step 3: Fill in eas.json

Open `eas.json` and fill in the three values under `submit.production.ios`:

```json
"appleId": "your@email.com",
"ascAppId": "1234567890",
"appleTeamId": "ABC1234DEF"
```

---

## Step 4: Initialize EAS Project

Run this once from the `artifacts/multi-ai/` directory:

```bash
cd artifacts/multi-ai
eas login          # sign in with your Expo account (create one free at expo.dev)
eas init           # links this project to EAS, generates a project ID
```

After `eas init`, copy the project ID it gives you and update `app.json`:

```json
"updates": {
  "url": "https://u.expo.dev/YOUR_PROJECT_ID_HERE",
  ...
}
```

---

## Step 5: Build for Production

From `artifacts/multi-ai/`:

```bash
# iOS (builds on EAS cloud, no Mac required)
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Both at once
eas build --platform all --profile production
```

EAS builds in the cloud. It will:
- Ask you to log in to Apple on first run (to generate certificates automatically)
- Take ~15–20 minutes per platform
- Email you when done with a download link

---

## Step 6: Take Screenshots

Apple requires screenshots at three sizes. The easiest way:

**Option A — EAS Simulator build (recommended)**
```bash
eas build --platform ios --profile development
```
Open in iPhone 15 Pro Max simulator → take screenshots with Cmd+S.

**Option B — Preview mockups** (in this project)
Pre-built mockup screens are in the mockup sandbox at:
- `/preview/screenshots/HomeEmpty`
- `/preview/screenshots/HomeResponding`
- `/preview/screenshots/Synthesis`
- `/preview/screenshots/Thread`
- `/preview/screenshots/Pricing`

**Required screenshot sizes:**
| Size | Device | Dimensions |
|------|--------|-----------|
| 6.7" | iPhone 15 Pro Max | 1290 × 2796 px |
| 6.5" | iPhone 14 Plus | 1242 × 2688 px |
| 5.5" | iPhone 8 Plus | 1242 × 2208 px |

Minimum 3 screenshots per size. Aim for 5.

---

## Step 7: Fill in App Store Connect Listing

Use the copy from `store/metadata.md`. Paste into:
- Description
- Keywords
- What's New
- Support URL: `https://YOUR_DOMAIN/dreamtop/support`
- Privacy Policy URL: `https://YOUR_DOMAIN/dreamtop/privacy`

Set pricing to **Free** with in-app purchases.

---

## Step 8: Submit

```bash
# Submit iOS binary to App Store Connect
eas submit --platform ios --profile production

# Submit Android to Google Play
eas submit --platform android --profile production
```

Or upload manually via the Transporter app (Mac) / Google Play Console (web).

---

## Step 9: OTA Updates (after launch)

For bug fixes that don't change native code, you can ship instantly without App Store review:

```bash
eas update --channel production --message "Fix: quota display"
```

This pushes a JS-only update that users get on next app open. No review required.

---

## Checklist

- [ ] Apple Developer Program enrolled ($99)
- [ ] Google Play Console account active ($25 — already paid)
- [ ] App created in App Store Connect
- [ ] Bundle ID registered: `com.dreamtop.zenith`
- [ ] eas.json filled in (Apple ID, ASC App ID, Team ID)
- [ ] `eas init` run → project ID added to app.json updates URL
- [ ] Production build complete (iOS + Android)
- [ ] Screenshots ready (3 sizes for iOS, 2+ for Android)
- [ ] App Store Connect listing filled in
- [ ] Privacy Policy URL live: `/dreamtop/privacy`
- [ ] Support URL live: `/dreamtop/support`
- [ ] Submitted for review
- [ ] Review passed (Apple: 1–3 days; Google Play: hours–1 day)
