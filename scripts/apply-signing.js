const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
const gradlePropsPath = path.join(__dirname, '..', 'android', 'gradle.properties');

// 1. Optimize gradle.properties for faster CI builds
if (fs.existsSync(gradlePropsPath)) {
  let props = fs.readFileSync(gradlePropsPath, 'utf8');

  // Limit architectures to physical phone CPUs (ARM 32 & 64 bit), skipping x86 emulator C++ compile
  props = props.replace(
    /reactNativeArchitectures=.*/,
    'reactNativeArchitectures=armeabi-v7a,arm64-v8a'
  );

  // Give Gradle 4GB RAM on GitHub Actions runner
  props = props.replace(
    /org\.gradle\.jvmargs=.*/,
    'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m'
  );

  fs.writeFileSync(gradlePropsPath, props, 'utf8');
  console.log('Optimized android/gradle.properties (ARM architectures, 4GB heap).');
}

if (!fs.existsSync(buildGradlePath)) {
  console.log('android/app/build.gradle not found, skipping signing script.');
  process.exit(0);
}

let content = fs.readFileSync(buildGradlePath, 'utf8');

// 2. Inject dynamic versionCode from environment variable if present
if (!content.includes('System.getenv("VERSION_CODE")')) {
  content = content.replace(
    /versionCode\s+\d+/,
    'versionCode (System.getenv("VERSION_CODE") ? Integer.parseInt(System.getenv("VERSION_CODE")) : 1)'
  );
}

// 3. Add release signing configuration if not already added
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

// 4. Ensure release buildType points to signingConfigs.release if keystore is present, otherwise debug
content = content.replace(
  /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/,
  (match) => match.replace(
    'signingConfig signingConfigs.debug',
    'signingConfig (System.getenv("KEYSTORE_PATH") && file(System.getenv("KEYSTORE_PATH")).exists() ? signingConfigs.release : signingConfigs.debug)'
  )
);

fs.writeFileSync(buildGradlePath, content, 'utf8');
console.log('Successfully applied signing & version code configuration to android/app/build.gradle');
