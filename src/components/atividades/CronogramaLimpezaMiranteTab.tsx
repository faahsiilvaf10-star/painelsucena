import { Calendar, RotateCw, Sprout, Leaf, Droplets, Wind, Trash2, Wheat } from "lucide-react";

interface AtividadeRow {
  icon: React.ReactNode;
  nome: string;
  descricao: string;
  datas: string[];
}

const DATAS_PADRAO = ["15/05", "30/05", "14/06", "29/06", "14/07", "29/07"];

const ATIVIDADES: AtividadeRow[] = [
  {
    icon: <Trash2 className="w-full h-full" strokeWidth={1.5} />,
    nome: "Limpeza no Mirante",
    descricao:
      "Limpeza geral do mirante, incluindo piso, corrimãos, bancos, lixeiras e áreas de circulação.",
    datas: DATAS_PADRAO,
  },
  {
    icon: <Wheat className="w-full h-full" strokeWidth={1.5} />,
    nome: "Roço",
    descricao: "Roçagem da vegetação ao redor do mirante, trilhas e áreas adjacentes.",
    datas: DATAS_PADRAO,
  },
  {
    icon: <Sprout className="w-full h-full" strokeWidth={1.5} />,
    nome: "Reparo de Mudas",
    descricao:
      "Verificação e reparo de mudas, troca de tutores, reposição de amarras e cuidados necessários.",
    datas: DATAS_PADRAO,
  },
  {
    icon: <Leaf className="w-full h-full" strokeWidth={1.5} />,
    nome: "Adubação",
    descricao: "Adubação das mudas e áreas verdes conforme necessidade.",
    datas: DATAS_PADRAO,
  },
  {
    icon: <Droplets className="w-full h-full" strokeWidth={1.5} />,
    nome: "Lavagem com Pipa",
    descricao: "Lavagem de pisos, corrimãos, bancos e áreas externas com caminhão pipa.",
    datas: DATAS_PADRAO,
  },
  {
    icon: <Wind className="w-full h-full" strokeWidth={1.5} />,
    nome: "Limpeza com Soprador",
    descricao: "Limpeza de folhas, resíduos e detritos com soprador em toda a área do mirante e acessos.",
    datas: DATAS_PADRAO,
  },
];

export default function CronogramaLimpezaMiranteTab() {
  return (
    <div className="cronograma-page">
      <div className="cronograma-card">
        <div className="cronograma-header">
          <div className="logo-mirante">
            <Sprout className="w-20 h-20 text-[#1e572c]" strokeWidth={1.5} />
          </div>
          <div className="titulo-area">
            <h1>Cronograma de Manutenção</h1>
            <h2>Mirante</h2>
          </div>
        </div>

        <div className="info-box">
          <div className="info-icon">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="flex flex-col gap-1">
            <div>
              <span className="font-bold">FREQUÊNCIA:</span> A CADA 15 DIAS
            </div>
            <div>
              <span className="font-bold">PERÍODO:</span> MANUTENÇÃO CONTÍNUA
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="cronograma-table">
            <thead>
              <tr>
                <th className="col-atividade">Atividade</th>
                <th className="col-descricao">Descrição</th>
                <th className="col-frequencia">Frequência</th>
                <th colSpan={6}>Datas – Próximas Execuções</th>
              </tr>
            </thead>
            <tbody>
              {ATIVIDADES.map((a) => (
                <tr key={a.nome}>
                  <td className="col-atividade">
                    <div className="atividade-icon">{a.icon}</div>
                    <div className="atividade-nome">{a.nome}</div>
                  </td>
                  <td className="col-descricao">{a.descricao}</td>
                  <td className="col-frequencia">
                    <RotateCw className="frequencia-icon mx-auto" />
                    A CADA<br />15 DIAS
                  </td>
                  {a.datas.map((d, i) => (
                    <td key={i} className="data-cell">{d}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="observacoes">
          <strong>Observações:</strong>
          <span>Cronograma sujeito a ajustes conforme condições climáticas e necessidades do local.</span>
        </div>

        <div className="assinatura-area">
          <div className="flex-1 flex items-end gap-3">
            <span>RESPONSÁVEL:</span>
            <div className="linha-assinatura" />
          </div>
          <div className="flex items-end gap-3">
            <span>DATA:</span>
            <div className="w-12 border-b-2 border-black h-7" />
            <span>/</span>
            <div className="w-12 border-b-2 border-black h-7" />
            <span>/</span>
            <div className="w-16 border-b-2 border-black h-7" />
          </div>
        </div>
      </div>
    </div>
  );
}
