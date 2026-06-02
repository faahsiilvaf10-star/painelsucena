Modificar a lógica de envio de notificações de WhatsApp para lembretes adiados (snooze), garantindo que apenas lembretes marcados para "todos os usuários" sejam enviados para o grupo. Lembretes individuais ou para usuários específicos serão enviados apenas via mensagem privada.

### Detalhes técnicos
- Alterar a Edge Function `wapi-reminder-snooze-notify`:
  - Verificar o campo `mention_type` do lembrete.
  - Se `mention_type` for `all`, enviar apenas para o grupo de WhatsApp configurado.
  - Se `mention_type` for diferente de `all` (ex: `me` ou `specific`), não enviar para o grupo.
  - Garantir que o criador do lembrete receba a confirmação do adiamento em seu número privado quando o lembrete for "somente eu" ou "específico".
- Validar se a função `wapi-reminders-notify` (lembretes agendados) já segue esta regra.
- Implantar as alterações nas Edge Functions.