import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://fcaxyvptfwnwfctxkqre.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('NO KEY'); process.exit(1); }

const sb = createClient(SUPABASE_URL, KEY);
const buf = fs.readFileSync('/tmp/tiago-card.png');
const path = `epi-cards/manual-tiago-${Date.now()}.png`;

const { error: upErr } = await sb.storage.from('site-assets').upload(path, buf, {
  contentType: 'image/png', upsert: true
});
if (upErr) { console.error('upload', upErr); process.exit(1); }

const url = `${SUPABASE_URL}/storage/v1/object/public/site-assets/${path}`;
console.log('URL:', url);

const caption = `🦺 *TROCA DE EPI*

👤 *Funcionário:* TIAGO AUGUSTO ROSA MACHADO
🪪 *Matrícula:* 68991
💼 *Função:* TÉCNICO DE MEIO AMBIENTE
📅 *Data:* 29/04/2026
⚠️ *Motivo:* Danificada (rasgada)
✅ *Autorizado por:* ITAMAR DE SOUZA PEREIRA JUNIOR

📦 *Itens entregues:*
• LUVA TÁTIL — Qtd: 1

_Sucena Empreendimentos_`;

const { data: ins, error: insErr } = await sb.from('wapi_outbox').insert({
  kind: 'image',
  target_type: 'group',
  phone: '120363406691114696@g.us',
  image_url: url,
  caption,
  status: 'pending',
  origin: 'manual_resend',
  scheduled_at: new Date().toISOString()
}).select().single();
if (insErr) { console.error('insert', insErr); process.exit(1); }
console.log('Queued:', ins.id);

// Trigger worker
const r = await fetch(`${SUPABASE_URL}/functions/v1/wapi-queue-worker`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: '{}'
});
console.log('Worker:', r.status, await r.text());
