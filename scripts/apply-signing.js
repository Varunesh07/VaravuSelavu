const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(buildGradlePath)) {
  console.log('android/app/build.gradle not found, skipping signing script.');
  process.exit(0);
}

let content = fs.readFileSync(buildGradlePath, 'utf8');

// 1. Inject dynamic versionCode from environment variable if present
if (!content.includes('System.getenv("VERSION_CODE")')) {
  content = content.replace(
    /versionCode\s+\d+/,
    'versionCode (System.getenv("VERSION_CODE") ? Integer.parseInt(System.getenv("VERSION_CODE")) : 1)'
  );
}

// 2. Add release signing configuration if not already added
if (!content.includes('signingConfigs {') || !content.includes('release {')) {
  const signingConfigBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (System.getenv("KEYSTORE_PATH") && file(System.getenv("KEYSTORE_PATH")).exists()) {
                storeFile file(System.getenv("KEYSTORE_PATH"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            } else {
                signingConfig signingConfigs.debug
            }
        }
    }`;

  if (content.includes('buildTypes {')) {
    content = content.replace('buildTypes {', `${signingConfigBlock}\n    buildTypes {`);
  }
}

// 3. Ensure release buildType points to signingConfigs.release if keystore is present, otherwise debug
content = content.replace(
  /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/,
  (match) => match.replace(
    'signingConfig signingConfigs.debug',
    'signingConfig (System.getenv("KEYSTORE_PATH") && file(System.getenv("KEYSTORE_PATH")).exists() ? signingConfigs.release : signingConfigs.debug)'
  )
);

fs.writeFileSync(buildGradlePath, content, 'utf8');
console.log('Successfully applied signing & version code configuration to android/app/build.gradle');
