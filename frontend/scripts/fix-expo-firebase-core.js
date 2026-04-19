/**
 * Fixes expo-firebase-core Gradle incompatibility and API changes.
 * `classifier` was removed in Gradle 7+ — replace with `archiveClassifier`.
 * ExportedModule was removed in Expo SDK 49+ — update to InternalModule.
 * This runs automatically after every `npm install` via the postinstall hook.
 */
const fs   = require('fs');
const path = require('path');

const buildGradleFile = path.join(__dirname, '..', 'node_modules', 'expo-firebase-core', 'android', 'build.gradle');
const packageFile = path.join(__dirname, '..', 'node_modules', 'expo-firebase-core', 'android', 'src', 'main', 'java', 'expo', 'modules', 'firebase', 'core', 'FirebaseCorePackage.java');
const moduleFile = path.join(__dirname, '..', 'node_modules', 'expo-firebase-core', 'android', 'src', 'main', 'java', 'expo', 'modules', 'firebase', 'core', 'FirebaseCoreModule.java');

if (fs.existsSync(buildGradleFile)) {
  let content = fs.readFileSync(buildGradleFile, 'utf8');

  if (content.includes("classifier = 'sources'")) {
    content = content.replace("classifier = 'sources'", "archiveClassifier = 'sources'");
    fs.writeFileSync(buildGradleFile, content, 'utf8');
    console.log('[fix-expo-firebase-core] Fixed build.gradle: classifier → archiveClassifier');
  } else {
    console.log('[fix-expo-firebase-core] build.gradle already fixed.');
  }
} else {
  console.log('[fix-expo-firebase-core] build.gradle not found.');
}

if (fs.existsSync(packageFile)) {
  let content = fs.readFileSync(packageFile, 'utf8');

  // Remove import ExportedModule
  content = content.replace(/import expo\.modules\.core\.ExportedModule;\n/, '');

  // Remove the createExportedModules method
  const exportedMethodRegex = /\s+@Override\s+public List<ExportedModule> createExportedModules\(Context context\) \{\s+return Collections\.singletonList\(\(ExportedModule\) new FirebaseCoreModule\(context\)\);\s+\}\n/;
  content = content.replace(exportedMethodRegex, '');

  fs.writeFileSync(packageFile, content, 'utf8');
  console.log('[fix-expo-firebase-core] Fixed FirebaseCorePackage.java: removed ExportedModule usage');
} else {
  console.log('[fix-expo-firebase-core] FirebaseCorePackage.java not found.');
}

if (fs.existsSync(moduleFile)) {
  let content = fs.readFileSync(moduleFile, 'utf8');

  // Change import
  content = content.replace(/import expo\.modules\.core\.ExportedModule;/, 'import expo.modules.core.interfaces.InternalModule;');

  // Add Collections import
  content = content.replace(/import java\.util\.HashMap;/, 'import java.util.Collections;\nimport java.util.HashMap;');

  // Change class declaration
  content = content.replace(/public class FirebaseCoreModule extends ExportedModule \{/, 'public class FirebaseCoreModule implements InternalModule {');

  // Remove super(context)
  content = content.replace(/\s+super\(context\);\n/, '');

  // Remove getConstants method
  const constantsRegex = /\s+@Nullable\s+public Map<String, Object> getConstants\(\) \{[\s\S]*?\n\s+\}\n/;
  content = content.replace(constantsRegex, '');

  // Remove getName method
  const nameRegex = /\s+@Override\s+public String getName\(\) \{\s+return NAME;\s+\}\n/;
  content = content.replace(nameRegex, '');

  // Add getExportedInterfaces method
  content = content.replace(/(\s+)@Override\s+public void onCreate\(ModuleRegistry moduleRegistry\) \{\s+mModuleRegistry = moduleRegistry;\s+\}\s+\}/, '$1@Override\n$1public List<? extends Class> getExportedInterfaces() {\n$1  return Collections.emptyList();\n$1}\n\n$1@Override\n$1public void onCreate(ModuleRegistry moduleRegistry) {\n$1  mModuleRegistry = moduleRegistry;\n$1}\n}');

  fs.writeFileSync(moduleFile, content, 'utf8');
  console.log('[fix-expo-firebase-core] Fixed FirebaseCoreModule.java: changed to InternalModule');
} else {
  console.log('[fix-expo-firebase-core] FirebaseCoreModule.java not found.');
}
