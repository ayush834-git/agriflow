const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n/dictionaries.ts', 'utf-8');

const keysToAdd = {
  profitTracker: "Profit tracker",
  noCompletedTradesYet: "No completed trades yet",
  awaitingFirstTrade: "Awaiting first trade",
  currentPriceOpportunity: "Current price opportunity",
  kgExtra: "/kg extra",
  sellingPaysVsLocally: "Selling {cropName} in {targetDistrict} pays {targetPrice} vs {localPrice} locally.",
  completeTradeToTrack: "Complete your first trade to start tracking real savings.",
  listCropViaWhatsapp: "List your crop via WhatsApp or the Listings tab to capture this gap.",
  noPriceDataAvailable: "No price data available yet",
  priceDataBeingCollected: "Price data for {cropName} in your district is being collected. Check back soon.",
  earningsChartWillAppear: "Your earnings chart will appear here once you complete your first trade via the listing or WhatsApp flow.",
  verifiedTrades: "Verified trades",
  improvementOverLocal: "improvement over local mandi",
  match: "Match",
  savedLabel: "Saved:",
  localMandiLabel: "Local mandi:"
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

addKeysToSection('en', 'earnings', keysToAdd);
addKeysToSection('hi', 'earnings', keysToAdd);
addKeysToSection('te', 'earnings', keysToAdd);
addKeysToSection('kn', 'earnings', keysToAdd);

fs.writeFileSync('src/lib/i18n/dictionaries.ts', content);
