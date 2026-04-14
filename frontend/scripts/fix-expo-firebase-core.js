/**
 * Fixes expo-firebase-core Gradle incompatibility.
 * `classifier` was removed in Gradle 7+ — replace with `archiveClassifier`.
 * This runs automatically after every `npm install` via the postinstall hook.
 */
const fs   = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'expo-firebase-core', 'android', 'build.gradle');

if (!fs.existsSync(file)) {
  console.log('[fix-expo-firebase-core] File not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(file, 'utf8');

if (content.includes("classifier = 'sources'")) {
  content = content.replace("classifier = 'sources'", "archiveClassifier = 'sources'");
  fs.writeFileSync(file, content, 'utf8');
  console.log('[fix-expo-firebase-core] Fixed: classifier → archiveClassifier');
} else {
  console.log('[fix-expo-firebase-core] Already fixed, nothing to do.');
}
