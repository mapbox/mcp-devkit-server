// Quick test to see what keywords would be extracted
const context =
  'Creating popups that appear on hover over features or markers in Mapbox GL JS';

const stopWords = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'have',
  'has',
  'can',
  'will',
  'what',
  'how',
  'when',
  'where',
  'why'
]);

const contextWords = context.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
const keywords = contextWords.filter((word) => !stopWords.has(word));

console.log('Extracted keywords:', keywords);
console.log('Should match "hover":', keywords.includes('hover'));
console.log('Should match "popups":', keywords.includes('popups'));
