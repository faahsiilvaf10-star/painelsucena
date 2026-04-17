/**
 * Intercepta todas as chamadas fetch() para a API do Supabase e injeta o header
 * `x-environment` com o ambiente selecionado (Barcarena ou Paragominas).
 *
 * Esse header é lido no banco pela função `current_environment()`, que filtra
 * automaticamente todas as queries via RLS policies restritivas.
 */

const STORAGE_KEY = "selected_environment";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

function readEnvironment(): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === "barcarena" || raw === "paragominas") return raw;
  } catch {
    /* ignore */
  }
  return "barcarena";
}

let installed = false;

export function installEnvironmentHeader() {
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      // Só injeta em requisições para o Supabase
      if (SUPABASE_URL && url.startsWith(SUPABASE_URL)) {
        const env = readEnvironment();
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        headers.set("x-environment", env);

        const newInit: RequestInit = { ...init, headers };
        return originalFetch(input, newInit);
      }
    } catch {
      /* ignore — fallback to original fetch */
    }
    return originalFetch(input, init);
  };
}
