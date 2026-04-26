const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n/dictionaries.ts', 'utf-8');

const keysToAdd = {
  phase10Explainability: "Phase 10 matching explainability",
  matchActiveInventory: "Match active inventory with farmer listings",
  searchByCropDistrict: "Search by crop, district, and quantity range, then create a contact loop that notifies the farmer over WhatsApp.",
  farmerListingsInDirectory: "{count} farmer listings in the directory",
  inventoryBasis: "Inventory basis",
  district: "District",
  anyDistrict: "Any district",
  minQty: "Min qty",
  maxQty: "Max qty",
  match: "Match",
  ask: "Ask",
  distanceKm: "Distance {distance} km",
  freshness: "Freshness {label}",
  quantityFit: "Quantity fit {fit}%",
  whyThisMatch: "Why this match",
  directoryScoreBalances: "The directory score balances quantity fit, freshness window, price alignment, and transport distance.",
  quantityFitPercent: "Quantity fit {percent}%.",
  freshnessFitPercent: "Freshness fit {percent}% with {label}.",
  priceAlignmentPercent: "Price alignment {percent}% against the crop benchmark.",
  distanceFitPercent: "Distance fit {percent}% at {distance} km.",
  couldNotCreateMatch: "Could not create match.",
  farmerNotifiedWaitingForYes: "Farmer notified for {crop} in {district}. Waiting for YES reply.",
  connecting: "Connecting",
  connect: "Connect",
  noListingsMatch: "No listings match the current crop and quantity filters."
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

addKeysToSection('en', 'directory', keysToAdd);
addKeysToSection('hi', 'directory', keysToAdd);
addKeysToSection('te', 'directory', keysToAdd);
addKeysToSection('kn', 'directory', keysToAdd);

fs.writeFileSync('src/lib/i18n/dictionaries.ts', content);
