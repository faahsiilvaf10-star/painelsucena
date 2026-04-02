## Plano: Role Moderador + Edição em Tempo Real

### Fase 1 — Role de Moderador no Banco
- Adicionar `'moderator'` ao enum `app_role`
- Atualizar funções `is_admin` e `has_role` para incluir moderador
- Criar função `is_admin_or_moderator()` para RLS
- Atualizar políticas RLS existentes para permitir moderadores (mesmas permissões do admin, exceto exclusão de usuários e gerenciamento de roles)

### Fase 2 — Frontend: Reconhecer Moderador
- Atualizar `useUserRole` e `useIsAdmin` para reconhecer moderador
- Criar hook `useIsModerator`
- Ícone diferente para moderador (ex: Shield vs ShieldCheck do admin)
- Moderador acessa painel Admin (sem aba de gerenciar roles e sem botão de excluir usuários)

### Fase 3 — Sistema de Edição Inline (CMS)
- Criar tabela `page_customizations` para salvar edições (textos, imagens, cores)
- Componente `EditableText` — clica no texto, abre input inline, salva no banco
- Componente `EditableImage` — clica na imagem, abre upload, substitui
- Componente `EditableBanner` — para banners de campanhas
- Modo de edição ativado por toggle (visível só para moderadores/admins)
- Barra de ferramentas flutuante com opções de cor

### Fase 4 — Aplicar Editáveis nas Páginas
- Página de Campanhas: banners editáveis
- Logo principal: clicável para trocar
- Títulos de páginas: editáveis inline
- Cores de layout: painel de customização

### Restrições do Moderador
- ❌ Não pode excluir usuários
- ❌ Não pode gerenciar roles (promover/rebaixar)
- ✅ Todas as demais funções do admin
- ✅ Edição inline em tempo real
