// Gera card EPI usando @napi-rs/canvas via npx



const data = {
  funcionario_nome: "DOMINGUES FABRICIO DA SILVA SOUSA",
  funcionario_funcao: "ENCARREGADO GERAL",
  funcionario_matricula: "68469",
  autorizado_por: "ITAMAR DE SOUZA PEREIRA JUNIOR",
  motivo_troca: "Danificado",
  data: "2026-04-29",
  epis: [{ id: "colete", qty: 1 }],
};

const EPI_LABELS = {
  colete: "Colete Refletivo",
  capacete: "Capacete",
  bota: "Bota",
  luva: "Luva",
  oculos: "Óculos",
  protetor: "Protetor Auricular",
};

const { createCanvas } = require('@napi-rs/canvas');
const W = 1080, H = 1350;
const c = createCanvas(W, H);
const ctx = c.getContext('2d');

// Background gradient verde
const grad = ctx.createLinearGradient(0, 0, W, H);
grad.addColorStop(0, '#0f766e');
grad.addColorStop(1, '#064e3b');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);

// Card branco
ctx.fillStyle = 'white';
ctx.roundRect ? ctx.roundRect(60, 60, W-120, H-120, 32) : ctx.rect(60, 60, W-120, H-120);
ctx.fill();

// Header
ctx.fillStyle = '#0f766e';
ctx.fillRect(60, 60, W-120, 140);
ctx.fillStyle = 'white';
ctx.font = 'bold 56px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('TROCA DE EPI', W/2, 140);
ctx.font = '28px sans-serif';
ctx.fillText('SUCENA - Registro de Requisição', W/2, 180);

// Conteúdo
ctx.textAlign = 'left';
ctx.fillStyle = '#111827';
let y = 280;
const lh = 56;
const drawLine = (label, value) => {
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#0f766e';
  ctx.fillText(label, 110, y);
  ctx.font = '30px sans-serif';
  ctx.fillStyle = '#111827';
  ctx.fillText(String(value || '-'), 110, y + 36);
  y += lh + 30;
};

drawLine('FUNCIONÁRIO', data.funcionario_nome);
drawLine('FUNÇÃO', data.funcionario_funcao);
drawLine('MATRÍCULA', data.funcionario_matricula);
drawLine('AUTORIZADO POR', data.autorizado_por);
drawLine('MOTIVO DA TROCA', data.motivo_troca);
const [yy, mm, dd] = data.data.split('-');
drawLine('DATA', `${dd}/${mm}/${yy}`);

// EPIs
ctx.font = 'bold 28px sans-serif';
ctx.fillStyle = '#0f766e';
ctx.fillText('EPIs SOLICITADOS', 110, y);
y += 44;
ctx.font = '30px sans-serif';
ctx.fillStyle = '#111827';
for (const e of data.epis) {
  const label = EPI_LABELS[e.id] || e.id;
  ctx.fillText(`• ${label} — Qtd: ${e.qty}`, 130, y);
  y += 44;
}

// Footer
ctx.fillStyle = '#0f766e';
ctx.fillRect(60, H-140, W-120, 80);
ctx.fillStyle = 'white';
ctx.font = '24px sans-serif';
ctx.textAlign = 'center';
ctx.fillText(`Emitido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' })}`, W/2, H-90);

(async () => { const buf = await c.encode("png");
const fs = require("fs");
fs.writeFileSync('/tmp/epi_card.png', buf);
console.log('OK', buf.length);
})();
