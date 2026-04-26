const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n/dictionaries.ts', 'utf-8');

const keysToAdd = {
  recomputing: "Recomputing...",
  clickRefreshToGenerate: "Click Refresh to generate routes for {cropName}",
  moveWeightCropToTarget: "Move {weight}T {cropName}"
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

addKeysToSection('en', 'recommendations', keysToAdd);
addKeysToSection('hi', 'recommendations', keysToAdd);
addKeysToSection('te', 'recommendations', keysToAdd);
addKeysToSection('kn', 'recommendations', keysToAdd);

fs.writeFileSync('src/lib/i18n/dictionaries.ts', content);
