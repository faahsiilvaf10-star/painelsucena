import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

const W = 1080, H = 1350;
const c = createCanvas(W, H);
const ctx = c.getContext('2d');

// Background gradient
const grd = ctx.createLinearGradient(0, 0, 0, H);
grd.addColorStop(0, '#0f3d2e');
grd.addColorStop(1, '#0a2620');
ctx.fillStyle = grd;
ctx.fillRect(0, 0, W, H);

// Top accent bar
const accent = ctx.createLinearGradient(0, 0, W, 0);
accent.addColorStop(0, '#10b981');
accent.addColorStop(1, '#14b8a6');
ctx.fillStyle = accent;
ctx.fillRect(0, 0, W, 12);

// Header
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 64px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('🦺 TROCA DE EPI', W/2, 130);

ctx.fillStyle = '#10b981';
ctx.font = 'bold 32px sans-serif';
ctx.fillText('SUCENA EMPREENDIMENTOS', W/2, 180);

// Card
const cx = 60, cy = 230, cw = W - 120, ch = 980;
ctx.fillStyle = 'rgba(255,255,255,0.06)';
ctx.strokeStyle = 'rgba(16,185,129,0.4)';
ctx.lineWidth = 2;
roundRect(ctx, cx, cy, cw, ch, 24);
ctx.fill();
ctx.stroke();

let y = cy + 70;
const labelColor = '#94d3b8';
const valueColor = '#ffffff';

function row(label, value) {
  ctx.textAlign = 'left';
  ctx.fillStyle = labelColor;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(label, cx + 50, y);
  ctx.fillStyle = valueColor;
  ctx.font = '32px sans-serif';
  ctx.fillText(value, cx + 50, y + 42);
  y += 100;
}

row('👤 FUNCIONÁRIO', 'TIAGO AUGUSTO ROSA MACHADO');
row('🪪 MATRÍCULA', '68991');
row('💼 FUNÇÃO', 'TÉCNICO DE MEIO AMBIENTE');
row('📅 DATA', '29/04/2026');
row('⚠️ MOTIVO', 'Danificada (rasgada)');
row('✅ AUTORIZADO POR', 'ITAMAR DE SOUZA PEREIRA JUNIOR');

// Items header
y += 10;
ctx.fillStyle = labelColor;
ctx.font = 'bold 28px sans-serif';
ctx.fillText('📦 ITENS ENTREGUES', cx + 50, y);
y += 50;

// Item box
ctx.fillStyle = 'rgba(16,185,129,0.15)';
roundRect(ctx, cx + 50, y - 30, cw - 100, 60, 12);
ctx.fill();
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 30px sans-serif';
ctx.fillText('• LUVA TÁTIL', cx + 70, y + 10);
ctx.textAlign = 'right';
ctx.fillStyle = '#10b981';
ctx.fillText('Qtd: 1', cx + cw - 70, y + 10);

// Footer
ctx.textAlign = 'center';
ctx.fillStyle = 'rgba(255,255,255,0.5)';
ctx.font = '22px sans-serif';
ctx.fillText('Sistema de Controle Operacional • ' + new Date().toLocaleString('pt-BR', {timeZone:'America/Belem'}), W/2, H - 40);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

const buf = c.toBuffer('image/png');
fs.writeFileSync('/tmp/tiago-card.png', buf);
console.log('OK', buf.length);
