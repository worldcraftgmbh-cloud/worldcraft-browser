'use strict';

const fs = require('fs');
const path = require('path');

const errorTranslations = {
  de: {
    error_offline_headline: "SIGNAL UNTERBROCHEN // OFFLINE",
    error_offline_desc: "Keine Verbindung zum Netzwerk gefunden.",
    error_notfound_headline: "ZIEL NICHT GEFUNDEN // 404",
    error_notfound_desc: "Die angeforderte Adresse existiert nicht oder antwortet nicht.",
    error_btn_retry: "[ NEU VERBINDEN ]",
    error_btn_dashboard: "[ DASHBOARD ]",
    error_code_label: "FEHLERCODE",
    error_target_label: "ZIEL-ADRESSE"
  },
  en: {
    error_offline_headline: "SIGNAL INTERRUPTED // OFFLINE",
    error_offline_desc: "No connection to the network found.",
    error_notfound_headline: "TARGET NOT FOUND // 404",
    error_notfound_desc: "The requested address does not exist or does not respond.",
    error_btn_retry: "[ RECONNECT ]",
    error_btn_dashboard: "[ DASHBOARD ]",
    error_code_label: "ERROR CODE",
    error_target_label: "TARGET ADDRESS"
  },
  es: {
    error_offline_headline: "SEÑAL INTERRUMPIDA // SIN CONEXIÓN",
    error_offline_desc: "No se encontró conexión a la red.",
    error_notfound_headline: "DESTINO NO ENCONTRADO // 404",
    error_notfound_desc: "La dirección solicitada no existe o no responde.",
    error_btn_retry: "[ RECONECTAR ]",
    error_btn_dashboard: "[ PANEL ]",
    error_code_label: "CÓDIGO DE ERROR",
    error_target_label: "DIRECCIÓN DESTINO"
  },
  fr: {
    error_offline_headline: "SIGNAL INTERROMPU // HORS LIGNE",
    error_offline_desc: "Aucune connexion réseau trouvée.",
    error_notfound_headline: "CIBLE INTROUVABLE // 404",
    error_notfound_desc: "L'adresse demandée n'existe pas ou ne répond pas.",
    error_btn_retry: "[ RECONNECTER ]",
    error_btn_dashboard: "[ TABLEAU DE BORD ]",
    error_code_label: "CODE D'ERREUR",
    error_target_label: "ADRESSE CIBLE"
  },
  it: {
    error_offline_headline: "SEGNALE INTERROTTO // OFFLINE",
    error_offline_desc: "Nessuna connessione alla rete trovata.",
    error_notfound_headline: "DESTINAZIONE NON TROVATA // 404",
    error_notfound_desc: "L'indirizzo richiesto non esiste o non risponde.",
    error_btn_retry: "[ RICONNETTI ]",
    error_btn_dashboard: "[ DASHBOARD ]",
    error_code_label: "CODICE ERRORE",
    error_target_label: "INDIRIZZO DESTINAZIONE"
  },
  pl: {
    error_offline_headline: "SYGNAŁ PRZERWANY // OFFLINE",
    error_offline_desc: "Nie znaleziono połączenia z siecią.",
    error_notfound_headline: "CEL NIE ZNALEZIONY // 404",
    error_notfound_desc: "Żądany adres nie istnieje lub nie odpowiada.",
    error_btn_retry: "[ POŁĄCZ PONOWNIE ]",
    error_btn_dashboard: "[ PULPIT ]",
    error_code_label: "KOD BŁĘDU",
    error_target_label: "ADRES DOCELOWY"
  },
  uk: {
    error_offline_headline: "СИГНАЛ ВТРАЧЕНО // ОФЛАЙН",
    error_offline_desc: "З'єднання з мережею не знайдено.",
    error_notfound_headline: "ЦІЛЬ НЕ ЗНАЙДЕНО // 404",
    error_notfound_desc: "Запитувана адреса не існує або не відповідає.",
    error_btn_retry: "[ ПОВТОРНЕ ПІДКЛЮЧЕННЯ ]",
    error_btn_dashboard: "[ ПАНЕЛЬ ]",
    error_code_label: "КОД ПОМИЛКИ",
    error_target_label: "ЦІЛЬОВА АДРЕСА"
  }
};

const localesDir = path.resolve(__dirname, '..', 'locales');
for (const [lang, keys] of Object.entries(errorTranslations)) {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    Object.assign(data, keys);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Updated ${lang}.json with error keys.`);
  }
}

// Re-generate src/locales.js
require('./generate-locales');
