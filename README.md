# Worldcraft Browser // Matrix Edition

> **Worldcraft Browser** ist ein moderner, eigenständiger Desktop-Webbrowser im futuristischen Cyberpunk-/Matrix-Design, entwickelt von **Worldcraft Systems**.

---

## ⚡ Kernfunktionen

1. **Matrix / Cyberpunk Design-System**:
   - Dunkle Ästhetik mit Neon-Grün-Akzenten (`#00ff66`), digitalem Matrix-Code-Regen und dezenten Glow-Effekten.
   - Responsives Grid- & Flexbox-Layout mit sichtbaren Focus-Ringen und voller Tastaturbedienbarkeit.
   - Unterstützt `prefers-reduced-motion` zur Schonung der Systemressourcen.

2. **Native Multi-Tab Navigation**:
   - Modernste Electron `WebContentsView`-Architektur zur vollständigen Trennung zwischen Browser-Chrome und Webseiten.
   - Tab-Verwaltung mit Favicons, Ladestatus, dynamischem Hinzufügen und Schließen.
   - Intelligente URL-Leiste für direkte HTTP/HTTPS-Navigation oder Websuche (Google, DuckDuckGo, Bing, Ecosia).

3. **Homescreen & Speed Dial**:
   - Eigene lokale Startseite mit digitaler Uhr in Echtzeit.
   - Großes Cyber-Suchfeld für blitzschnelle Recherchen.
   - Speed Dial Kacheln (YouTube, Amazon, WorldCraft Radio, benutzerdefinierte Favoriten) mit Bearbeitungs- und Löschfunktion.

4. **Integrierter Neural-Core Assistent**:
   - Eingebettetes Seitenpanel für Konversationen und Recherchen.
   - **„Aktuelle Seite zusammenfassen“**: Sichere Extraktion des Webseitentextes mit automatischer Abwehr von Prompt-Injection-Angriffen.
   - Sichere Schlüsselverwaltung: Speicherung des API-Keys über OS `safeStorage` (Windows DPAPI) ohne Klartext-Leaks.
   - Flexible Modellauswahl für neuronale Sprachmodelle.

5. **WorldCraft WebRadio**:
   - Dauerhafter HTML5-Audioplayer mit Live-Streams (Nightride Synthwave, Chillsynth, Darksynth, SomaFM Space Station, DEF CON Radio).
   - Audio-Visualizer mit animierten Frequenzbalken.
   - Musik läuft unterbrechungsfrei beim Wechseln zwischen Browser-Tabs weiter.

6. **Web-App Auskopplung (Pop-Out)**:
   - Einzelne Webseiten können per Klick in ein eigenes, minimalistisches App-Fenster ohne Browser-Bedienelemente ausgekoppelt werden.

7. **Sicherheitsarchitektur**:
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `sandbox: true`
   - `webviewTag: false`
   - Strikter Preload-Vertrag ohne generische IPC-Kanäle.
   - Blockierung gefährlicher URL-Schemata (`javascript:`, `file:`, `data:`, `vbscript:`).

---

## 🛠️ Projektstruktur

```text
worldcraft-browser/
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── main.js
├── preload.js
├── src/
│   ├── index.html
│   ├── renderer.js
│   ├── styles.css
│   └── assets/
│       ├── worldcraft-logo.svg
│       └── worldcraft-icon.svg
├── services/
│   ├── gemini-service.js
│   ├── storage-service.js
│   └── url-helper.js
├── scripts/
│   └── verify-build.js
├── tests/
│   ├── smoke.test.js
│   └── security.test.js
├── build/
│   └── README.md
└── dist/
    └── [durch electron-builder generierte Installer-Dateien]
```

---

## 🚀 Installation & Befehle

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. Entwicklungssitzung starten
```bash
npm start
# oder
npm run dev
```

### 3. Automatisierte Tests ausführen
```bash
npm test
```

### 4. Build-Verifikation durchführen
```bash
npm run verify
```

### 5. Windows-Installer (.exe) erstellen
```bash
npm run build
```

Die fertige NSIS-Installationsdatei wird in `dist/` abgelegt:
`dist/Worldcraft Browser Setup.exe`

---

## 🔐 Neural Core API-Key Konfiguration

1. Starte den Browser und klicke auf das Zahnrad-Symbol (Einstellungen) oder öffne die Einstellungen in der linken Seitenleiste.
2. Trage deinen API-Key ein.
3. Klicke auf **„Schlüssel speichern“**.
4. Der Schlüssel wird über Electron SafeStorage verschlüsselt gespeichert und kann im Neural Core Panel sofort genutzt werden.
