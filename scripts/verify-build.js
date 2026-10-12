'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('   WORLDCRAFT BROWSER // BUILD VERIFICATION SUITE   ');
console.log('====================================================');

const requiredFiles = [
  'package.json',
  'main.js',
  'preload.js',
  'src/index.html',
  'src/renderer.js',
  'src/styles.css',
  'src/assets/worldcraft-logo.svg',
  'src/assets/worldcraft-icon.svg',
  'services/gemini-service.js',
  'services/ai-service.js',
  'services/storage-service.js',
  'services/url-helper.js',
  'services/download-service.js',
  'services/update-service.js',
  'src/settings.html',
  'src/settings.js',
  'src/downloads.html',
  'src/newtab.html',
  'src/locales.js',
  'src/error.html',
  'src/assets/cyberpunk-bg.png',
  'src/assets/datastream-globe.jpg',
  'src/assets/flags/de.svg',
  'src/assets/flags/en.svg',
  'src/assets/flags/es.svg',
  'src/assets/flags/fr.svg',
  'src/assets/flags/it.svg',
  'src/assets/flags/pl.svg',
  'src/assets/flags/uk.svg',
  'tests/smoke.test.js',
  'tests/security.test.js',
  'tests/download.test.js',
  'tests/forge.test.js',
  'build/icon.ico',
  'build/installerSidebar.bmp',
  'build/installerHeader.bmp'
];

let failed = false;

console.log('\n[1/3] Überprüfe Quellcode-Dateien und Branding-Assets:');
for (const file of requiredFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    console.log(`  [OK] ${file} (${stat.size} Bytes)`);
  } else {
    console.error(`  [FEHLER] Fehlende Datei: ${file}`);
    failed = true;
  }
}

console.log('\n[2/3] Überprüfe Konfiguration in package.json:');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  console.log(`  [OK] Produktname: "${pkg.build?.productName || pkg.name}"`);
  console.log(`  [OK] App-ID: "${pkg.build?.appId}"`);
  console.log(`  [OK] Version: ${pkg.version}`);
  console.log(`  [OK] Target: ${JSON.stringify(pkg.build?.win?.target)}`);
  console.log(`  [OK] ArtifactName: "${pkg.build?.win?.artifactName}"`);
  if (Array.isArray(pkg.build?.protocols)) {
    console.log(`  [OK] Registrierte Protokolle: ${pkg.build.protocols.map(p => (p.schemes || []).join(', ')).join('; ')}`);
  }
  if (Array.isArray(pkg.build?.fileAssociations)) {
    console.log(`  [OK] Dateizuordnungen: ${pkg.build.fileAssociations.map(f => `.${f.ext} (${f.role})`).join(', ')}`);
  }
} catch (err) {
  console.error(`  [FEHLER] package.json konnte nicht geparst werden:`, err.message);
  failed = true;
}

console.log('\n[3/3] Überprüfe dist/ Verzeichnis und Build-Artefakte:');
const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  const distFiles = fs.readdirSync(distDir);
  const exeFiles = distFiles.filter((f) => f.endsWith('.exe'));

  if (exeFiles.length > 0) {
    console.log(`  [OK] Gefundene ausführbare Dateien in dist/:`);
    for (const exe of exeFiles) {
      const fullExePath = path.join(distDir, exe);
      const stat = fs.statSync(fullExePath);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
      console.log(`    -> ${exe} (${sizeMB} MB)`);
      console.log(`       Pfad: ${fullExePath}`);
    }
  } else {
    console.log('  [HINWEIS] Kein .exe-Installer in dist/ gefunden (Führe "npm run build" aus).');
  }
} else {
  console.log('  [HINWEIS] Verzeichnis dist/ existiert noch nicht (wird beim Build erstellt).');
}

console.log('\n====================================================');
if (failed) {
  console.error('VERIFIKATION FEHLGESCHLAGEN: Mindestens eine Datei fehlt.');
  process.exit(1);
} else {
  console.log('VERIFIKATION ERFOLGREICH: Alle Quell- und Konfigurationsprüfungen bestanden.');
  process.exit(0);
}
