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

  // Increase network timeouts to prevent 504 gateway timeout on jar downloads
  props += '\nsystemProp.org.gradle.internal.http.connectionTimeout=120000\n';
  props += 'systemProp.org.gradle.internal.http.socketTimeout=120000\n';

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

// 3. Add release signing configuration to signingConfigs
const releaseSigningBlock = `        release {
            if (System.getenv("KEYSTORE_PATH") && file(System.getenv("KEYSTORE_PATH")).exists()) {
                storeFile file(System.getenv("KEYSTORE_PATH"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

if (!content.includes('storeFile file(System.getenv("KEYSTORE_PATH"))')) {
  if (content.includes('signingConfigs {')) {
    content = content.replace('signingConfigs {', `signingConfigs {\n${releaseSigningBlock}`);
  } else if (content.includes('buildTypes {')) {
    content = content.replace('buildTypes {', `    signingConfigs {\n${releaseSigningBlock}\n    }\n    buildTypes {`);
  }
}

// 4. Ensure release buildType points to signingConfigs.release
const buildTypesIdx = content.indexOf('buildTypes {');
if (buildTypesIdx !== -1) {
  const beforeBuildTypes = content.substring(0, buildTypesIdx);
  let afterBuildTypes = content.substring(buildTypesIdx);
  afterBuildTypes = afterBuildTypes.replace(
    /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/,
    (match) => match.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release')
  );
  content = beforeBuildTypes + afterBuildTypes;
}

fs.writeFileSync(buildGradlePath, content, 'utf8');
console.log('Successfully applied signing & version code configuration to android/app/build.gradle');
