// Helpers para calcular a validade efetiva do ASO de um colaborador.
// Regra:
//  - Se houver pelo menos uma data definida em { validade, periodico, retornoTrabalho, mudancaRisco },
//    a base é a MAIS RECENTE entre elas e o vencimento efetivo é base + 1 ano.
//    Exceção: se a "mais recente" for a própria validade, ela já representa o vencimento — usamos como está.
//  - Se nenhuma das quatro estiver definida, a base é a data de admissão e o vencimento é admissão + 1 ano.
//  - Se nem admissão existir, retorna null.

export interface AsoLike {
  admissional?: string;
  validade?: string;
  periodico?: string;
  retornoTrabalho?: string;
  mudancaRisco?: string;
}

const parseBR = (d?: string | null): Date | null => {
  if (!d) return null;
  const parts = d.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (!day || !month || !year) return null;
  const dt = new Date(year, month - 1, day);
  if (isNaN(dt.getTime())) return null;
  return dt;
};

const formatBR = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const addOneYear = (d: Date): Date => {
  const next = new Date(d);
  next.setFullYear(next.getFullYear() + 1);
  return next;
};

/**
 * Retorna a data efetiva de vencimento do ASO (Date) seguindo a regra acima.
 */
export function getEffectiveAsoExpiry(
  aso: AsoLike | undefined | null,
  admissao?: string | null
): Date | null {
  const candidates: Array<{ key: "validade" | "periodico" | "retornoTrabalho" | "mudancaRisco"; date: Date }> = [];
  if (aso) {
    (["validade", "periodico", "retornoTrabalho", "mudancaRisco"] as const).forEach((k) => {
      const dt = parseBR(aso[k]);
      if (dt) candidates.push({ key: k, date: dt });
    });
  }

  if (candidates.length > 0) {
    // Mais recente
    candidates.sort((a, b) => b.date.getTime() - a.date.getTime());
    const latest = candidates[0];
    // Se a mais recente já é a "validade", ela é o vencimento — não somar de novo.
    if (latest.key === "validade") return latest.date;
    return addOneYear(latest.date);
  }

  const adm = parseBR(admissao);
  if (adm) return addOneYear(adm);
  return null;
}

/**
 * Versão string (dd/mm/yyyy) do vencimento efetivo.
 */
export function getEffectiveAsoExpiryStr(
  aso: AsoLike | undefined | null,
  admissao?: string | null
): string | null {
  const d = getEffectiveAsoExpiry(aso, admissao);
  return d ? formatBR(d) : null;
}
