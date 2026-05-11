/**
 * Prepare Montserrat Arabic fonts for upload
 * Copy these font files to the public folder for easy access
 */

const fs = require('fs');
const path = require('path');

const sourceDir = 'H:\\dd\\frontend';
const targetDir = path.join(sourceDir, 'public', 'fonts');

// Create fonts directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('✅ Created public/fonts directory');
}

const fontFiles = [
  'MONTSERRAT-ARABIC-LIGHT.TTF',
  'MONTSERRAT-ARABIC-REGULAR.TTF'
];

console.log('📁 Font files should be placed in: public/fonts/');
console.log('You can copy them from the frontend root directory.');
console.log('\nTo use these fonts in CSS:');
console.log('@font-face {');
console.log('  font-family: "Montserrat Arabic Light";');
console.log('  src: url("/fonts/MONTSERRAT-ARABIC-LIGHT.TTF") format("truetype");');
console.log('}');
console.log('@font-face {');
console.log('  font-family: "Montserrat Arabic Regular";');
console.log('  src: url("/fonts/MONTSERRAT-ARABIC-REGULAR.TTF") format("truetype");');
console.log('}');
