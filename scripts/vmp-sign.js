'use strict';

/**
 * electron-builder "afterSign" hook: VMP-signiert das Windows-Paket (dist/win-unpacked) via Castlabs EVS.
 *
 * Warum afterSign (und nicht afterPack)? Die VMP-Signatur gilt fuer die finale Worldcraft-Browser.exe.
 * electron-builder aendert die EXE nach afterPack noch (ASAR-Integrity, Code-Signing). Wuerde man vorher
 * signieren, waere die VMP-Signatur ungueltig und Netflix/Widevine lehnt den Player ab.
 *
 * Voraussetzungen (einmalig):
 *   python -m pip install --upgrade castlabs-evs
 *   python -m castlabs_evs.account signup      (bzw. "reauth" auf einem neuen Rechner)
 *
 * Umgebungsvariablen:
 *   VMP_REQUIRED=1   Build bricht ab, wenn die VMP-Signatur nicht erstellt werden kann (empfohlen fuer Releases).
 *   VMP_SKIP=1       VMP-Signierung ueberspringen (lokale Test-Builds).
 *   EVS_ACCOUNT_NAME / EVS_PASSWD   EVS-Zugangsdaten fuer CI (ohne TTY).
 */

const { spawnSync } = require('child_process');

const PYTHON_CANDIDATES = [
  ['python', []],
  ['py', ['-3']],
  ['python3', []]
];

function runPython(args, options = {}) {
  for (const [cmd, prefix] of PYTHON_CANDIDATES) {
    const res = spawnSync(cmd, [...prefix, ...args], {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, EVS_NO_ASK: process.env.EVS_NO_ASK || '1' },
      ...options
    });
    if (res.error && res.error.code === 'ENOENT') continue; // Interpreter nicht vorhanden -> naechsten testen
    return res;
  }
  return { error: new Error('Kein Python-Interpreter gefunden (python / py -3 / python3).'), status: null };
}

module.exports = async function vmpSign(context) {
  if (context.electronPlatformName !== 'win32') return;

  const required = process.env.VMP_REQUIRED === '1';
  if (process.env.VMP_SKIP === '1') {
    console.warn('[VMP] VMP_SKIP=1 gesetzt - VMP-Signierung uebersprungen (Netflix/Widevine-Produktion funktioniert so nicht).');
    return;
  }

  const appOutDir = context.appOutDir;
  const productFilename = (context.packager && context.packager.appInfo && context.packager.appInfo.productFilename) || 'Worldcraft Browser';
  console.log(`[VMP] Signiere ${appOutDir} (Name-Hint: "${productFilename}") via castlabs_evs ...`);

  const res = runPython(['-m', 'castlabs_evs.vmp', 'sign-pkg', '-H', productFilename, appOutDir]);
  if (res.error || res.status !== 0) {
    const reason = res.error ? res.error.message : `Exit-Code ${res.status}`;
    const msg = `[VMP] Signierung fehlgeschlagen (${reason}). Pruefe: "pip install castlabs-evs" und "python -m castlabs_evs.account signup|reauth".`;
    if (required) throw new Error(msg);
    console.warn(`${msg}\n[VMP] Build laeuft weiter (VMP_REQUIRED!=1) - DRM-Streams wie Netflix werden ohne gueltige VMP-Signatur blockiert.`);
    return;
  }

  console.log(`[VMP] Verifiziere Signatur fuer ${appOutDir} ...`);
  const verifyRes = runPython(['-m', 'castlabs_evs.vmp', 'verify-pkg', '-H', productFilename, appOutDir]);
  if (verifyRes.error || verifyRes.status !== 0) {
    const reason = verifyRes.error ? verifyRes.error.message : `Exit-Code ${verifyRes.status}`;
    const msg = `[VMP] Signatur-Verifikation nach dem Signieren fehlgeschlagen (${reason}).`;
    if (required) throw new Error(msg);
    console.warn(msg);
    return;
  }

  console.log('[VMP] Signatur erfolgreich erstellt und validiert.');
};
