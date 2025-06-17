const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Crear directorio public si no existe
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Función para crear un ícono simple
function createIcon(size, text, bgColor, textColor, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fondo
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  
  // Texto
  ctx.fillStyle = textColor;
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);
  
  // Guardar archivo
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, filename), buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

// Crear íconos
createIcon(192, 'S', '#1e40af', 'white', 'pwa-192x192.png');
createIcon(512, 'S', '#1e40af', 'white', 'pwa-512x512.png');
createIcon(180, 'S', '#1e40af', 'white', 'apple-touch-icon.png');
createIcon(32, 'S', '#1e40af', 'white', 'favicon.ico');

console.log('Icons generated successfully!');
