const fs = require('fs');
const path = require('path');

const locales = ['de', 'en', 'es', 'fr', 'it', 'pl', 'uk'];
const dicts = {};

for (const lang of locales) {
  const jsonPath = path.join(__dirname, '..', 'locales', `${lang}.json`);
  dicts[lang] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

const content = `'use strict';

const LOCALES = ` + JSON.stringify(dicts, null, 2) + `;

const LANGUAGE_NAMES = {
  de: { name: 'Deutsch', code: 'DE', flag: 'assets/flags/de.svg' },
  en: { name: 'English', code: 'US/UK', flag: 'assets/flags/en.svg' },
  es: { name: 'Español', code: 'ES', flag: 'assets/flags/es.svg' },
  fr: { name: 'Français', code: 'FR', flag: 'assets/flags/fr.svg' },
  it: { name: 'Italiano', code: 'IT', flag: 'assets/flags/it.svg' },
  pl: { name: 'Polski', code: 'PL', flag: 'assets/flags/pl.svg' },
  uk: { name: 'Українська', code: 'UK', flag: 'assets/flags/uk.svg' }
};

if (typeof window !== 'undefined') {
  window.WORLDCRAFT_LOCALES = LOCALES;
  window.WORLDCRAFT_LANGUAGES = LANGUAGE_NAMES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOCALES, LANGUAGE_NAMES };
}
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'locales.js'), content, 'utf8');
console.log('Successfully generated src/locales.js, bytes:', content.length);
