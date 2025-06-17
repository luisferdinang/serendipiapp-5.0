const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuración
const inputSvg = path.join(__dirname, 'public', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, 'public');

// Tamaños necesarios para PWA
const sizes = [192, 512, 180, 32];

async function generateIcons() {
  try {
    console.log('Iniciando generación de íconos...');
    
    // Asegurarse de que el directorio de salida existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generar cada tamaño de ícono
    for (const size of sizes) {
      let outputFile;
      
      // Determinar el nombre del archivo de salida según el tamaño
      if (size === 192) outputFile = 'pwa-192x192.png';
      else if (size === 512) outputFile = 'pwa-512x512.png';
      else if (size === 180) outputFile = 'apple-touch-icon.png';
      else if (size === 32) outputFile = 'favicon.ico';
      
      const outputPath = path.join(outputDir, outputFile);
      
      console.log(`Generando ${outputFile} (${size}x${size})...`);
      
      // Usar sharp para convertir SVG a PNG con el tamaño especificado
      await sharp(inputSvg)
        .resize(size, size)
        .toFile(outputPath);
      
      console.log(`✅ ${outputFile} generado correctamente`);
    }
    
    console.log('\n🎉 ¡Todos los íconos se han generado correctamente!');
    console.log('Los íconos se han guardado en la carpeta public/');
    
  } catch (error) {
    console.error('❌ Error al generar los íconos:', error);
    process.exit(1);
  }
}

// Instalar sharp si no está instalado
async function ensureSharpIsInstalled() {
  try {
    require.resolve('sharp');
  } catch (err) {
    console.log('Instalando sharp... (esto puede tomar un momento)');
    const { execSync } = require('child_process');
    execSync('npm install sharp', { stdio: 'inherit' });
  }
}

// Ejecutar el script
(async () => {
  await ensureSharpIsInstalled();
  await generateIcons();
})();
