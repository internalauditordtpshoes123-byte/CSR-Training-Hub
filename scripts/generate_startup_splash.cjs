const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function generateStartupSplashHD() {
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Pure clean white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Load and draw the official DA TIAN logo
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/datian-logo.svg'));
  const logoImg = await loadImage(svgBuffer);

  // Original logo aspect ratio is 800:520 (1.5385)
  const logoW = 380;
  const logoH = Math.round(logoW * (520 / 800)); // 247
  const logoX = Math.round((width - logoW) / 2);
  const logoY = 170;

  // Add subtle, crisp corporate elevation shadow for the logo on white
  ctx.save();
  ctx.shadowColor = 'rgba(15, 30, 60, 0.09)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  ctx.restore();

  // Helper for centered text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 3. Text "CSR DEPARTMENT" (Changed from "RUBBER DEPARTMENT")
  ctx.fillStyle = '#205b9f';
  ctx.font = 'bold 18px "Liberation Sans", "Helvetica Neue", Arial, sans-serif';
  // Simulate letter spacing
  const csrDeptText = 'C S R   D E P A R T M E N T';
  ctx.fillText(csrDeptText, width / 2, 470);

  // 4. Main Title "CSR HUB" (Changed from "SCHEDULER HUB")
  ctx.fillStyle = '#0f1d38';
  ctx.font = '900 66px "Liberation Sans", "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('CSR HUB', width / 2, 545);

  // 5. "Da Tian Subic Shoes, Inc." underneath
  ctx.fillStyle = '#64748b';
  ctx.font = '500 22px "Liberation Sans", "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Da Tian Subic Shoes, Inc.', width / 2, 605);

  // 6. Yellow horizontal accent line
  const lineWidth = 150;
  const lineHeight = 5;
  const lineX = (width - lineWidth) / 2;
  const lineY = 645;
  const lineGrad = ctx.createLinearGradient(lineX, lineY, lineX + lineWidth, lineY);
  lineGrad.addColorStop(0, '#f59e0b');
  lineGrad.addColorStop(0.5, '#fec52e');
  lineGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = lineGrad;
  ctx.beginPath();
  ctx.roundRect(lineX, lineY, lineWidth, lineHeight, 3);
  ctx.fill();

  // 7 & 8. "INITIALIZING" loading text & loading indicators and progress bar
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 14px "Liberation Mono", monospace';
  ctx.fillText('I N I T I A L I Z I N G . . .', width / 2, 875);

  // Progress Bar track
  const barW = 440;
  const barH = 8;
  const barX = (width - barW) / 2;
  const barY = 905;

  // Track background & subtle border
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 4);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Progress Bar active fill (72% progress)
  const fillW = Math.round(barW * 0.72);
  const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
  fillGrad.addColorStop(0, '#205b9f');
  fillGrad.addColorStop(0.7, '#3b82f6');
  fillGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, fillW, barH, 4);
  ctx.fill();

  // 9. Small build/version text in the bottom-right corner
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 13px "Liberation Mono", monospace';
  ctx.fillText('BUILD 2026.09.16 • v2.4.0 • CSR ENTERPRISE', width - 40, height - 35);

  // Save to public files
  const outPath1 = path.join(__dirname, '../public/startup-splash-white.png');
  const outPath2 = path.join(__dirname, '../public/images/startup-splash-white.png');

  fs.mkdirSync(path.dirname(outPath2), { recursive: true });
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath1, buffer);
  fs.writeFileSync(outPath2, buffer);

  console.log(`Generated HD Startup Splash Screen (1920x1080) at:
- ${outPath1} (${buffer.length} bytes)
- ${outPath2} (${buffer.length} bytes)`);
}

generateStartupSplashHD().catch(console.error);
