# 06 — Build, Release and Updates

Goal: change code → push to GitHub → GitHub builds a signed APK automatically → download it on the phone → install **over** the old app → all data stays.

## The one rule that protects the user's data
Android only installs an update over an existing app if:
1. the **applicationId** (`android.package`) is the same, and
2. the APK is signed with the **same keystore**, and
3. the **versionCode** is higher than the installed one.

If any of these differ, Android forces an uninstall, which erases the data. So:
- Choose `android.package` once (e.g. `com.<yourname>.varavuselavu`) and never change it.
- Create ONE release keystore, use it for every build, and **back it up outside GitHub** (phone cloud, USB drive, password manager). If it is lost, updates can no longer install over the old app.
- Increase `versionCode` on every build automatically (use the GitHub run number).

## Local development
- `npx expo start` and open in Expo Go or a development build on the phone for fast testing (hot reload).
- If a package needs custom native code that Expo Go lacks, make a development build once: `npx expo prebuild` + `npx expo run:android` (phone connected by USB with USB debugging on).

## One-time: create the keystore
Run once on any computer with Java:
```
keytool -genkeypair -v -storetype PKCS12 -keystore varavuselavu-release.keystore \
  -alias varavuselavu -keyalg RSA -keysize 2048 -validity 10000
```
Remember the passwords. Then convert to base64 for GitHub:
```
base64 -w 0 varavuselavu-release.keystore > keystore.b64      # Linux / Git Bash
```
Never commit the keystore or the base64 file.

## GitHub repository secrets
Repo → Settings → Secrets and variables → Actions → add:
| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | contents of keystore.b64 |
| `KEYSTORE_PASSWORD` | store password |
| `KEY_ALIAS` | `varavuselavu` |
| `KEY_PASSWORD` | key password |

(The Groq API key is NOT a secret here; the user types it in the app.)

## Signing setup (done once in code)
Use an Expo config plugin (or a small script run after `expo prebuild`) that adds a `release` signing config to `android/app/build.gradle` reading these environment variables: `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. Also read `VERSION_CODE` from the environment for `versionCode`. The script must be repeatable because `expo prebuild` regenerates the android folder.

## Workflow file `.github/workflows/build-apk.yml`
Outline (the agent writes the exact YAML):
1. Trigger: `push` to `main` and manual `workflow_dispatch`.
2. Runner: `ubuntu-latest`.
3. Steps:
   - `actions/checkout`
   - `actions/setup-node` (Node 20, npm cache)
   - `actions/setup-java` (Temurin 17)
   - `npm ci`
   - `npx expo prebuild --platform android --no-install` (clean)
   - Decode `KEYSTORE_BASE64` into `$RUNNER_TEMP/release.keystore`, export `KEYSTORE_PATH`
   - Apply the signing script
   - `cd android && ./gradlew assembleRelease` with env `VERSION_CODE=${{ github.run_number }}`
   - Rename APK to `Varavuselavu-v<version>-<run_number>.apk`
   - `actions/upload-artifact` and also create a **GitHub Release** with the APK attached (so it can be downloaded from the phone's browser by opening the repo's Releases page).
4. Cache Gradle (`gradle/actions/setup-gradle`) so builds take a few minutes.

GitHub Actions is free for personal use within monthly limits (more than enough for this app). If the repo is private, keep an eye on the monthly minutes.

## Updating the app (the daily routine)
1. Make a change with Antigravity, test with Expo Go.
2. Commit and push to `main`.
3. Wait for the GitHub Action to finish (green check).
4. On the phone, open the GitHub repo → Releases → download the newest APK.
5. Tap the downloaded file → "Update". (First time only: allow "Install unknown apps" for the browser.)
6. Open the app. Data is still there.

Before big changes: tap **Back up now** in Settings, just in case.

## Release checklist (every release)
- [ ] `version` in app.json bumped (e.g. 1.0.1) for the user to see.
- [ ] Database migration added if tables changed (never edit old migrations).
- [ ] Tested update-over-old on the real phone with real data.
- [ ] Backup file restore tested if the backup format changed (bump `schema_version` and keep reading old versions).
- [ ] No secrets in the repo (search for "gsk_" and "keystore" before pushing).
- [ ] No financial data, tool results or notes printed in release logs.

## Do not use
- Debug APKs for daily use (slower, different signing).
- Google Play Store (not needed for personal use).
- Changing the package name, keystore or alias after the first install.
