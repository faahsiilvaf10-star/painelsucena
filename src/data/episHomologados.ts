export type CategoriaEPI = 
  | "Proteção da Cabeça"
  | "Proteção dos Olhos e Face"
  | "Proteção Auditiva"
  | "Proteção Respiratória"
  | "Proteção das Mãos"
  | "Proteção dos Pés"
  | "Proteção do Corpo"
  | "Proteção Contra Quedas"
  | "Acessórios";

export interface EPIHomologado {
  id: number;
  nome: string;
  ca: string;
  categoria: CategoriaEPI;
  descricaoProtecao: string;
  contratadas?: boolean;
}

export const episHomologados: EPIHomologado[] = [];

export const categoriasEPIs: CategoriaEPI[] = [
  "Proteção da Cabeça",
  "Proteção dos Olhos e Face",
  "Proteção Auditiva",
  "Proteção Respiratória",
  "Proteção das Mãos",
  "Proteção dos Pés",
  "Proteção do Corpo",
  "Proteção Contra Quedas",
  "Acessórios",
];
