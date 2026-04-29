## Reenvio manual da última requisição EPI (TIAGO)

A última requisição registrada no banco é do funcionário **TIAGO AUGUSTO ROSA MACHADO** (matrícula 68991), criada em 29/04 às 12:04. Já existe um envio anterior marcado como `sent` no `wapi_outbox` (ID `f95b4b2f...`), mas o usuário relata que o card chegou em branco no grupo.

### Plano

1. **Gerar novo PNG server-side** usando `@napi-rs/canvas` (1080x1350) com:
   - Logo Sucena no topo
   - Cabeçalho "TROCA DE EPI"
   - Dados: Funcionário, Função, Matrícula, Data, Motivo
   - Lista de itens (LUVA TATIL x1)
   - Autorizado por: ITAMAR DE SOUZA PEREIRA JUNIOR
   - Rodapé com timestamp
2. **Upload** para `site-assets/epi-cards/manual-tiago-{timestamp}.png` (novo nome, sem cache CDN antigo).
3. **Inserir nova mensagem** em `wapi_outbox` com:
   - `kind: image`
   - `target_type: group`
   - `phone: 120363406691114696@g.us` (grupo de requisições)
   - `image_url`: nova URL pública
   - `caption`: mesmo texto formatado da troca
   - `origin: manual_resend`
4. **Invocar** `wapi-queue-worker` imediatamente para entrega sem aguardar o cron.
5. **Verificar** status final em `wapi_outbox` e `wapi_message_logs`.

### Detalhes técnicos

- Arquivo de script temporário: `/tmp/render-tiago-card.mjs` usando `@napi-rs/canvas` já instalado no `package.json`.
- Upload via `supabase.storage.from('site-assets').upload(...)` com service role key.
- Cache-bust no nome do arquivo garante que o WhatsApp não puxe imagem antiga.

Aprovando, executo o reenvio agora.