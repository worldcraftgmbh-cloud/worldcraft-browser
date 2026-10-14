'use strict';

/**
 * Validiert die fuer GitHub Releases notwendigen Artefakte in dist/
 * und gibt die exakten Bereitstellungs-Befehle aus.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

console.log('====================================================');
console.log(` WORLDCRAFT BROWSER // RELEASE ARTIFACT VERIFIER V${pkg.version}`);
console.log('====================================================\n');

if (!fs.existsSync(distDir)) {
  console.error('[FEHLER] Verzeichnis dist/ existiert nicht. Bitte erst "npm run build" ausfuehren.');
  process.exit(1);
}

const expectedInstaller = 'Worldcraft-Browser-Setup.exe';
const expectedBlockmap = 'Worldcraft-Browser-Setup.exe.blockmap';
const expectedLatestYml = 'latest.yml';

const installerPath = path.join(distDir, expectedInstaller);
const blockmapPath = path.join(distDir, expectedBlockmap);
const latestYmlPath = path.join(distDir, expectedLatestYml);

let hasError = false;

// 1. Installer
if (!fs.existsSync(installerPath)) {
  console.error(`[FEHLER] Installer nicht gefunden: ${installerPath}`);
  hasError = true;
} else {
  const stat = fs.statSync(installerPath);
  console.log(`[OK] Installer gefunden: ${expectedInstaller} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

// 2. Blockmap
if (!fs.existsSync(blockmapPath)) {
  console.error(`[FEHLER] Blockmap nicht gefunden: ${blockmapPath}`);
  hasError = true;
} else {
  const stat = fs.statSync(blockmapPath);
  console.log(`[OK] Blockmap gefunden: ${expectedBlockmap} (${stat.size} Bytes)`);
}

// 3. latest.yml
if (!fs.existsSync(latestYmlPath)) {
  console.error(`[FEHLER] latest.yml Metadaten nicht gefunden: ${latestYmlPath}`);
  hasError = true;
} else {
  const ymlContent = fs.readFileSync(latestYmlPath, 'utf8');
  console.log(`[OK] latest.yml Metadaten gefunden:\n---`);
  console.log(ymlContent.trim());
  console.log('---\n');

  if (fs.existsSync(installerPath)) {
    const fileBuf = fs.readFileSync(installerPath);
    const actualSha512 = crypto.createHash('sha512').update(fileBuf).digest('base64');
    if (ymlContent.includes(actualSha512)) {
      console.log(`[OK] SHA-512 Pruefsumme in latest.yml stimmt exakt mit der Datei ueberein.`);
    } else {
      console.warn(`[WARNUNG] SHA-512 in latest.yml weicht ab. Wurde der Installer nach latest.yml neu erstellt?`);
    }
  }
}

if (hasError) {
  console.error('\n[FEHLER] Release-Artefakte unvollstaendig. Bitte Build erneut ausfuehren.');
  process.exit(1);
}

console.log('\n[ERFOLG] Alle 3 Release-Dateien sind vollstaendig und bereit.');
console.log('\nEmpfohlener Befehl zum veroeffentlichen/aktualisieren auf GitHub:');
console.log(`  gh release upload v${pkg.version} "dist/${expectedInstaller}" "dist/${expectedBlockmap}" "dist/${expectedLatestYml}" --clobber`);
console.log('====================================================\n');
