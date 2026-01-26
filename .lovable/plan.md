
# Plano: Manter Sessão Persistente ao Fechar Navegador

## Problema Identificado

Atualmente, quando o usuário fecha o navegador e reabre, a sessão é perdida e o usuário precisa fazer login novamente. Isso acontece apesar do cliente Supabase estar configurado com `persistSession: true`.

## Causa Raiz

Após análise detalhada, identificamos que o problema está relacionado ao **tempo de vida do token de sessão** e à lógica de timeout que usa `sessionStorage`:

1. **useSessionTimeout.ts**: Armazena `session_start_time` no `sessionStorage`, que é limpo ao fechar o navegador
2. **Refresh Token**: O token pode estar expirando no lado do servidor antes do usuário reabrir o navegador
3. **Lógica de verificação**: Ao reabrir, sem o `session_start_time`, o sistema pode estar interpretando incorretamente o estado da sessão

## Solução Proposta

### 1. Migrar Session Timeout para localStorage

**Arquivo**: `src/hooks/useSessionTimeout.ts`

Alterar o armazenamento do tempo de início da sessão de `sessionStorage` para `localStorage`. Isso garantirá que:
- O tempo de sessão persista entre fechamentos do navegador
- A lógica de 5 horas funcione corretamente mesmo após reabrir o navegador
- Evitar criar um novo "tempo de início" a cada vez que o navegador é aberto

```text
Mudanças:
├── Linha 6: Renomear constante para indicar uso de localStorage
├── Linhas 15, 24-28: Trocar sessionStorage por localStorage
├── Linha 80, 90: Trocar sessionStorage por localStorage
└── Adicionar lógica para verificar se o token ainda é válido
```

### 2. Adicionar Verificação de Validade do Token

**Arquivo**: `src/hooks/useSessionTimeout.ts`

Antes de forçar logout por timeout, verificar se a sessão do Supabase ainda é válida:

```text
Lógica:
1. Ao carregar, verificar se existe session_start_time no localStorage
2. Se existir e ainda estiver dentro das 5 horas, manter sessão
3. Se estiver fora das 5 horas, fazer logout
4. Se não existir, criar novo timestamp (primeira vez ou após logout manual)
```

### 3. Melhorar Resiliência do ProtectedRoute

**Arquivo**: `src/components/ProtectedRoute.tsx`

Adicionar tentativa de refresh do token antes de redirecionar para login:

```text
Mudanças:
└── Antes de redirecionar para /auth, tentar supabase.auth.refreshSession()
```

### 4. (Opcional) Configurar JWT Expiry no Backend

Se o problema persistir, pode ser necessário ajustar a configuração de autenticação no backend para aumentar o tempo de vida do refresh token.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSessionTimeout.ts` | Migrar de sessionStorage para localStorage |
| `src/components/ProtectedRoute.tsx` | Adicionar refresh automático do token |

## Fluxo Após Implementação

```text
Usuário fecha navegador
        ↓
Token armazenado em localStorage (já funciona)
session_start_time em localStorage (NOVO)
        ↓
Usuário reabre navegador
        ↓
ProtectedRoute tenta getSession()
        ↓
Se token expirado → refreshSession()
        ↓
useSessionTimeout verifica tempo desde login
        ↓
Se < 5 horas → mantém logado
Se > 5 horas → logout automático
```

## Considerações Técnicas

- **Segurança**: O localStorage não é ideal para dados sensíveis, mas o timestamp de início de sessão não é um dado sensível
- **Limpeza**: O timestamp será removido no logout manual, garantindo que uma nova sessão comece do zero
- **Compatibilidade**: Esta mudança é retrocompatível - usuários existentes simplesmente terão um novo timestamp criado

## Benefícios

1. Sessão persiste ao fechar/reabrir navegador
2. Timeout de 5 horas continua funcionando corretamente
3. Experiência do usuário melhorada (não precisa logar a cada vez)
4. Segurança mantida com limite de 5 horas de sessão
