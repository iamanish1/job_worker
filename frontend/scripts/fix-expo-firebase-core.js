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

const PACKAGE_FILE_CONTENT = `package expo.modules.firebase.core;

import android.content.Context;

import java.util.Collections;
import java.util.List;

import expo.modules.core.BasePackage;
import expo.modules.core.interfaces.InternalModule;

public class FirebaseCorePackage extends BasePackage {
  @Override
  public List<InternalModule> createInternalModules(Context context) {
    return Collections.singletonList((InternalModule) new FirebaseCoreService(context));
  }
}
`;

const MODULE_FILE_CONTENT = `package expo.modules.firebase.core;

import android.content.Context;

import java.util.Collections;
import java.util.List;

import expo.modules.core.interfaces.InternalModule;
import expo.modules.core.ModuleRegistry;

public class FirebaseCoreModule implements InternalModule {
  private ModuleRegistry mModuleRegistry;

  public FirebaseCoreModule(Context context) {
    // Constructor
  }

  @Override
  public List<? extends Class> getExportedInterfaces() {
    return Collections.emptyList();
  }

  @Override
  public void onCreate(ModuleRegistry moduleRegistry) {
    mModuleRegistry = moduleRegistry;
  }
}
`;

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
  fs.writeFileSync(packageFile, PACKAGE_FILE_CONTENT, 'utf8');
  console.log('[fix-expo-firebase-core] Rewrote FirebaseCorePackage.java with InternalModule implementation');
} else {
  console.log('[fix-expo-firebase-core] FirebaseCorePackage.java not found.');
}

if (fs.existsSync(moduleFile)) {
  fs.writeFileSync(moduleFile, MODULE_FILE_CONTENT, 'utf8');
  console.log('[fix-expo-firebase-core] Rewrote FirebaseCoreModule.java with InternalModule implementation');
} else {
  console.log('[fix-expo-firebase-core] FirebaseCoreModule.java not found.');
}
