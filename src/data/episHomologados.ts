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

export const episHomologados: EPIHomologado[] = [
  // Proteção da Cabeça
  { id: 1, nome: "Capacete (Branco ou vermelho)", ca: "CA 498", categoria: "Proteção da Cabeça", descricaoProtecao: "Proteção contra impactos de objetos sobre o crânio e contra choques elétricos." },
  { id: 2, nome: "Capacete", ca: "CA 29638", categoria: "Proteção da Cabeça", descricaoProtecao: "Proteção contra impactos de objetos sobre o crânio e contra choques elétricos." },
  { id: 3, nome: "Capacete", ca: "CA 12482", categoria: "Proteção da Cabeça", descricaoProtecao: "Proteção contra impactos de objetos sobre o crânio." },
  { id: 4, nome: "Capacete", ca: "CA 44758", categoria: "Proteção da Cabeça", descricaoProtecao: "Proteção contra impactos de objetos sobre o crânio e contra choques elétricos.", contratadas: true },
  { id: 5, nome: "Boné de segurança", ca: "CA 38352", categoria: "Proteção da Cabeça", descricaoProtecao: "Proteção contra impactos de objetos sobre o crânio." },
  { id: 6, nome: "Capuz + protetor facial", ca: "CA 29993", categoria: "Proteção da Cabeça", descricaoProtecao: "Proteção do crânio e pescoço do usuário contra agentes térmicos, escoriantes e abrasivos." },
  { id: 7, nome: "Capacete para combate a incêndio", ca: "CA 34392", categoria: "Proteção da Cabeça", descricaoProtecao: "Proteção de crânio e face contra riscos de fontes geradoras de calor em incêndio." },
  { id: 8, nome: "Suspensão para capacete", ca: "CA 498", categoria: "Acessórios", descricaoProtecao: "Acessório para uso conjugado com capacete de CA 498." },

  // Proteção dos Olhos e Face
  { id: 9, nome: "Protetor facial de alumínio", ca: "CA 48343", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos do usuário contra impactos de partículas volantes." },
  { id: 10, nome: "Protetor facial", ca: "CA 49438", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos do usuário contra impactos de partículas volantes." },
  { id: 11, nome: "Protetor facial (lente e/ou suporte)", ca: "CA 20574", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Acessório para uso conjugado com a máscara de solda de CA 20574." },
  { id: 12, nome: "Protetor facial", ca: "CA 31752", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes." },
  { id: 13, nome: "Óculos de segurança", ca: "CA 15019", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes e raios ultravioletas (visor cinza).", contratadas: true },
  { id: 14, nome: "Óculos de segurança", ca: "CA 20716", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes e raios ultravioletas (visor cinza)." },
  { id: 15, nome: "Óculos de segurança", ca: "CA 18828 / 10346", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes e raios ultravioletas (visor cinza)." },
  { id: 16, nome: "Óculos de segurança", ca: "CA 19072", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes e raios ultravioletas (visor cinza)." },
  { id: 17, nome: "Óculos de segurança", ca: "CA 37022", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes e raios ultravioletas." },
  { id: 18, nome: "Óculos de segurança", ca: "CA 19074", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes." },
  { id: 19, nome: "Óculos de segurança", ca: "CA 20717", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes." },
  { id: 20, nome: "Óculos de segurança", ca: "CA 28240", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes.", contratadas: true },
  { id: 21, nome: "Óculos de segurança", ca: "CA 10344", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes e raios ultravioletas (visor cinza)." },
  { id: 22, nome: "Óculos de segurança", ca: "CA 8704", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes." },
  { id: 23, nome: "Óculos de segurança", ca: "CA 29904", categoria: "Proteção dos Olhos e Face", descricaoProtecao: "Proteção dos olhos contra impacto e partículas volantes e raios ultravioletas (visor cinza)." },
  { id: 24, nome: "Clipe para óculos de segurança", ca: "CA 19072", categoria: "Acessórios", descricaoProtecao: "Acessório para uso conjugado ao óculos de segurança." },
  { id: 25, nome: "Spray antiembaçante (Mavaro)", ca: "Sem CA", categoria: "Acessórios", descricaoProtecao: "Proteção da integridade das lentes dos óculos de segurança." },
  { id: 26, nome: "Spray antiembaçante (Carbografite)", ca: "Sem CA", categoria: "Acessórios", descricaoProtecao: "Proteção da integridade das lentes dos óculos de segurança." },

  // Proteção Auditiva
  { id: 27, nome: "Protetor auricular", ca: "CA 820", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora.", contratadas: true },
  { id: 28, nome: "Protetor auricular", ca: "CA 27971", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora." },
  { id: 29, nome: "Protetor auricular", ca: "CA 27972", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora." },
  { id: 30, nome: "Protetor auricular", ca: "CA 29706", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora.", contratadas: true },
  { id: 31, nome: "Protetor auricular", ca: "CA 29702", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora." },
  { id: 32, nome: "Protetor auricular", ca: "CA 11882", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora." },
  { id: 33, nome: "Protetor auricular", ca: "CA 45413", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora." },
  { id: 34, nome: "Protetor auricular", ca: "CA 14235 / 33835", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora.", contratadas: true },
  { id: 35, nome: "Protetor auricular", ca: "CA 43041", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora.", contratadas: true },
  { id: 36, nome: "Protetor auricular", ca: "CA 5745", categoria: "Proteção Auditiva", descricaoProtecao: "Proteção contra níveis de pressão sonora.", contratadas: true },

  // Proteção Respiratória
  { id: 37, nome: "Respirador descartável PFF1", ca: "CA 5658", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas." },
  { id: 38, nome: "Respirador descartável PFF1", ca: "CA 448", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas." },
  { id: 39, nome: "Respirador descartável PFF2", ca: "CA 5657", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas." },
  { id: 40, nome: "Respirador descartável PFF2", ca: "CA 41515", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas.", contratadas: true },
  { id: 41, nome: "Respirador descartável PFF2", ca: "CA 33796", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas." },
  { id: 42, nome: "Respirador descartável PFF2", ca: "CA 33804", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas." },
  { id: 43, nome: "Respirador descartável PFF2S", ca: "CA 38263", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas." },
  { id: 44, nome: "Respirador descartável PFF3", ca: "CA 42954", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras e névoas.", contratadas: true },
  { id: 45, nome: "Respirador descartável PFF2", ca: "CA 2072", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra poeiras, névoas, fumos e radionuclídeos e partículas não oleosas.", contratadas: true },
  { id: 46, nome: "Respirador semifacial", ca: "CA 14848", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra partículas, fumos e névoas." },
  { id: 47, nome: "Respirador semifacial", ca: "CA 12011", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra partículas, fumos e névoas." },
  { id: 48, nome: "Filtro para respirador", ca: "CA 11582", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra partículas, fumos e névoas." },
  { id: 49, nome: "Cartucho químico para vapores orgânicos", ca: "CA 15048", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção contra vapores orgânicos." },
  { id: 50, nome: "Respirador facial inteiro", ca: "CA 14296", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção do sistema respiratório contra partículas, gases e vapores." },
  { id: 51, nome: "Respirador de fuga", ca: "CA 5992", categoria: "Proteção Respiratória", descricaoProtecao: "Proteção para fuga de emergência em atmosferas IPVS." },

  // Proteção das Mãos
  { id: 52, nome: "Luva de vaqueta", ca: "CA 10695", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 53, nome: "Luva de vaqueta", ca: "CA 13968", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 54, nome: "Luva de raspa", ca: "CA 11712", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 55, nome: "Luva de raspa (cano longo)", ca: "CA 12003", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 56, nome: "Luva de látex", ca: "CA 7017", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 57, nome: "Luva tátil", ca: "CA 51313", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 58, nome: "Luva tátil", ca: "CA 31492", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 59, nome: "Luva tátil", ca: "CA 46932", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 60, nome: "Luva tátil", ca: "CA 17601", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 61, nome: "Luva tátil", ca: "CA 45830", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 62, nome: "Luva tátil", ca: "CA 33859", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 63, nome: "Luva tátil", ca: "CA 25280", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 64, nome: "Luva tátil", ca: "CA 42957", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 65, nome: "Luva de algodão", ca: "CA 10464", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 66, nome: "Luva tátil", ca: "CA 36848", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 67, nome: "Luva tátil", ca: "CA 18193", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 68, nome: "Luva tátil", ca: "CA 31519", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 69, nome: "Luva tátil", ca: "CA 27955", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 70, nome: "Luva com fios de aço com resistência ao corte", ca: "CA 47320", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 71, nome: "Luva com fios de aço com resistência ao corte", ca: "CA 32765", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 72, nome: "Luva com resistência ao corte", ca: "CA 42957", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 73, nome: "Luva anticorte", ca: "CA 27118", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 74, nome: "Luva malha de aço", ca: "CA 26967", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra cortes por facas manuais e objetos similares.", contratadas: true },
  { id: 75, nome: "Luva tátil com resistência a impacto", ca: "CA 28449", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e impacto." },
  { id: 76, nome: "Luva tátil com resistência a impacto", ca: "CA 45831", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e impacto.", contratadas: true },
  { id: 77, nome: "Luva tátil com resistência a impacto", ca: "CA 31901", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e impacto." },
  { id: 78, nome: "Luva de couro com resistência a impacto", ca: "CA 44320", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e impacto." },
  { id: 79, nome: "Luva de vaqueta com resistência a impacto", ca: "CA 45262", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e impacto.", contratadas: true },
  { id: 80, nome: "Luva de vaqueta com resistência a impacto", ca: "CA 48016", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e impacto.", contratadas: true },
  { id: 81, nome: "Luva para proteção de vibração", ca: "CA 38257", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e vibração nas mãos e dedos.", contratadas: true },
  { id: 82, nome: "Luva de vaqueta e raspa", ca: "CA 49635", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 83, nome: "Luva de vaqueta e raspa", ca: "CA 11711", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 84, nome: "Luva de vaqueta e raspa", ca: "CA 49435", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 85, nome: "Luva de vaqueta e raspa", ca: "CA 17074", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes.", contratadas: true },
  { id: 86, nome: "Luva de vaqueta", ca: "CA 8290", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 87, nome: "Luva anticorte", ca: "CA 39416", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e impacto.", contratadas: true },
  { id: 88, nome: "Luva térmica", ca: "CA 28651", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, perfurantes e contra agentes térmicos (chamas, contato, convectivo, radiante e metais fundidos)." },
  { id: 89, nome: "Luva térmica", ca: "CA 10978", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes térmicos.", contratadas: true },
  { id: 90, nome: "Luva térmica", ca: "CA 21252", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes térmicos.", contratadas: true },
  { id: 91, nome: "Luva para motosserras", ca: "CA 13256", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção para uso em motosserras." },
  { id: 92, nome: "Luva de PVC contra impacto", ca: "CA 44608", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, químicos e resistente a impacto." },
  { id: 93, nome: "Luva de PVC contra impacto", ca: "CA 52862", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, químicos e resistente a impacto." },
  { id: 94, nome: "Luva de Nitrilo PVC", ca: "CA 17419", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos." },
  { id: 95, nome: "Luva de PVC", ca: "CA 43226", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, químicos e biológicos." },
  { id: 96, nome: "Luva de PVC", ca: "CA 34570", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos." },
  { id: 97, nome: "Luva nitrílica", ca: "CA 25313", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos." },
  { id: 98, nome: "Luva nitrílica", ca: "CA 51168", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, químicos e operações com água." },
  { id: 99, nome: "Luva nitrílica", ca: "CA 12074", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, químicos e operações com água." },
  { id: 100, nome: "Luva nitrílica / neoprene", ca: "CA 46060", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos." },
  { id: 101, nome: "Luva nitrílica descartável", ca: "CA 42027", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes químicos." },
  { id: 102, nome: "Luva nitrílica descartável", ca: "CA 43217", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes químicos.", contratadas: true },
  { id: 103, nome: "Luva de látex e algodão flocado", ca: "CA 14334", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, químicos e operações com água.", contratadas: true },
  { id: 104, nome: "Luva nitrílica", ca: "CA 12598", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos.", contratadas: true },
  { id: 105, nome: "Luva de borracha", ca: "CA 15532", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos.", contratadas: true },
  { id: 106, nome: "Luva de látex e algodão flocado", ca: "CA 2429", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes, químicos e operações com água." },
  { id: 107, nome: "Luva de látex forrada com algodão flocado", ca: "CA 13301", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos." },
  { id: 108, nome: "Luva de PVC", ca: "CA 16397", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra agentes abrasivos, escoriantes, cortantes e químicos.", contratadas: true },
  { id: 109, nome: "Luva isolante para eletricidade", ca: "CA 7395", categoria: "Proteção das Mãos", descricaoProtecao: "Proteção contra choques elétricos." },

  // Proteção dos Pés
  { id: 110, nome: "Botina de segurança", ca: "CA 35817", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos e agentes abrasivos e escoriantes." },
  { id: 111, nome: "Botina de segurança", ca: "CA 45649", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos e agentes abrasivos e escoriantes." },
  { id: 112, nome: "Botina de segurança", ca: "CA 37338", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos e agentes abrasivos e escoriantes.", contratadas: true },
  { id: 113, nome: "Botina de segurança", ca: "CA 44541", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos e agentes abrasivos e escoriantes.", contratadas: true },
  { id: 114, nome: "Botina de segurança com biqueira composta", ca: "CA 28510", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos e agentes abrasivos e escoriantes." },
  { id: 115, nome: "Botina – tipo B", ca: "CA 17854", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos, agentes abrasivos, escoriantes, umidade de operações com água e químicos." },
  { id: 116, nome: "Bota em PU de cano longo", ca: "CA 34671", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos, agentes abrasivos, escoriantes, umidade de operações com água e químicos." },
  { id: 117, nome: "Bota em PVC de cano longo", ca: "CA 37750 / 37992", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção contra impactos de quedas de objetos, agentes abrasivos, escoriantes, umidade de operações com água e químicos." },
  { id: 118, nome: "Perneira de segurança", ca: "CA 28513", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção das pernas contra agentes abrasivos, escoriantes, cortantes e perfurantes." },
  { id: 119, nome: "Perneira para motosserra", ca: "CA 8591", categoria: "Proteção dos Pés", descricaoProtecao: "Proteção das pernas para uso de motosserra." },

  // Proteção do Corpo
  { id: 120, nome: "Blusão de segurança", ca: "CA 35240", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química e umidade de operações com água." },
  { id: 121, nome: "Avental em Nylon", ca: "CA 46906", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química e umidade de operações com água." },
  { id: 122, nome: "Macacão de segurança", ca: "CA 40039", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química." },
  { id: 123, nome: "Macacão de segurança", ca: "CA 4895", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química." },
  { id: 124, nome: "Macacão de segurança", ca: "CA 39705", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química.", contratadas: true },
  { id: 125, nome: "Macacão de segurança", ca: "CA 34187", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química." },
  { id: 126, nome: "Capuz Chemical resistent", ca: "CA 38381", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química.", contratadas: true },
  { id: 127, nome: "Macacão de segurança", ca: "CA 39119", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química." },
  { id: 128, nome: "Macacão de segurança", ca: "CA 34406", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química." },
  { id: 129, nome: "Macacão de segurança", ca: "CA 39989", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química." },
  { id: 130, nome: "Macacão de segurança", ca: "CA 42145", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química.", contratadas: true },
  { id: 131, nome: "Macacão de segurança", ca: "CA 20662", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química.", contratadas: true },
  { id: 132, nome: "Calça de PVC", ca: "CA 29789", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química.", contratadas: true },
  { id: 133, nome: "Calça de PVC", ca: "CA 36578", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química e contra umidade de operações com água." },
  { id: 134, nome: "Calça de PVC", ca: "CA 41027", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química e contra umidade de operações com água." },
  { id: 135, nome: "Calça de PVC", ca: "CA 35239", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química e contra umidade de operações com água." },
  { id: 136, nome: "Calça de PVC", ca: "CA 32783", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química e contra umidade de operações com água." },
  { id: 137, nome: "Calça de PVC", ca: "CA 36004", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção contra riscos de origem química e contra umidade de operações com água." },
  { id: 138, nome: "Avental de raspa", ca: "CA 35340", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção do tronco contra riscos de origem térmica." },
  { id: 139, nome: "Vestimenta para combate a incêndio", ca: "CA 33795", categoria: "Proteção do Corpo", descricaoProtecao: "Proteção do corpo contra riscos térmicos." },

  // Proteção Contra Quedas
  { id: 140, nome: "Cinto de segurança tipo paraquedista", ca: "CA 45595", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção contra quedas em trabalhos em altura." },
  { id: 141, nome: "Cinto de segurança tipo paraquedista", ca: "CA 44816", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção contra quedas em trabalhos em altura.", contratadas: true },
  { id: 142, nome: "Cinto de segurança tipo paraquedista", ca: "CA 36628", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção contra quedas em trabalhos em altura." },
  { id: 143, nome: "Talabarte duplo com absorvedor de energia", ca: "CA 44817", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção contra quedas em trabalhos em altura.", contratadas: true },
  { id: 144, nome: "Talabarte duplo com absorvedor de energia", ca: "CA 45596", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção contra quedas em trabalhos em altura." },
  { id: 145, nome: "Talabarte de posicionamento", ca: "CA 37706", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção e posicionamento em trabalhos em altura." },
  { id: 146, nome: "Trava-quedas retrátil", ca: "CA 41127", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção contra quedas em trabalhos em altura." },
  { id: 147, nome: "Trava-quedas em cabo de aço", ca: "CA 36623", categoria: "Proteção Contra Quedas", descricaoProtecao: "Proteção contra quedas em trabalhos em altura." },
  { id: 148, nome: "Mosquetão", ca: "CA 36627", categoria: "Proteção Contra Quedas", descricaoProtecao: "Acessório de conexão para sistemas de proteção contra quedas." },
];

export const categoriasEPIs: CategoriaEPI[] = [
  "Proteção da Cabeça",
  "Proteção dos Olhos e Face",
  "Proteção Auditiva",
  "Proteção Respiratória",
  "Proteção das Mãos",
  "Proteção dos Pés",
  "Proteção do Corpo",
  "Proteção Contra Quedas",
  "Acessórios"
];
