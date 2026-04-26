const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n/dictionaries.ts', 'utf-8');

const keysToAdd = {
  trendForecastForDistrict: "{cropName} · 7-day trend + 4-day forecast for {district}",
  trendForecastAllDistricts: "{cropName} · 7-day trend + 4-day forecast across all districts",
  range: "Range:",
  aiAnalysis: "AI Analysis",
  bestWindow: "Best window: "
};

function addKeysToSection(lang, section, keys) {
  const regex = new RegExp(`(${lang}: \\{[\\s\\S]*?${section}: \\{)`);
  if(content.match(regex)) {
    let keysStr = '';
    for(const [k, v] of Object.entries(keys)) {
       keysStr += `\n      ${k}: "${v}",`;
    }
    content = content.replace(regex, `$1${keysStr}`);
  }
}

addKeysToSection('en', 'forecast', keysToAdd);
addKeysToSection('hi', 'forecast', keysToAdd);
addKeysToSection('te', 'forecast', keysToAdd);
addKeysToSection('kn', 'forecast', keysToAdd);

fs.writeFileSync('src/lib/i18n/dictionaries.ts', content);
