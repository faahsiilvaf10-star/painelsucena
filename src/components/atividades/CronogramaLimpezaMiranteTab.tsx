import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  RotateCw,
  Sprout,
  Leaf,
  Droplets,
  Wind,
  Trash2,
  Wheat,
  Check,
  X,
  Bell,
  FileDown,
  ImageDown,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { triggerBlobDownload } from "@/lib/pdfDownload";
import iconLimpezaMirante from "@/assets/cron-limpeza_mirante.png";
import iconRoco from "@/assets/cron-roco.png";
import iconReparoMudas from "@/assets/cron-reparo_mudas.png";
import iconAdubacao from "@/assets/cron-adubacao.png";
import iconLavagemPipa from "@/assets/cron-lavagem_pipa.png";
import iconLimpezaSoprador from "@/assets/cron-limpeza_soprador.png";
import assinaturaResponsavel from "@/assets/assinatura-responsavel.png";

const iconImg = (src: string, alt: string) => (
  <img src={src} alt={alt} className="object-contain mx-auto" style={{ width: 90, height: 90 }} />
);

interface AtividadeDef {
  key: string;
  icon: React.ReactNode;
  nome: string;
  descricao: string;
}

interface DataItem {
  date: string; // dd/MM
  done: boolean;
}

const DEFAULT_DATAS: DataItem[] = [
  { date: "15/05", done: false },
  { date: "30/05", done: false },
  { date: "14/06", done: false },
  { date: "29/06", done: false },
  { date: "14/07", done: false },
  { date: "29/07", done: false },
];

const ATIVIDADES: AtividadeDef[] = [
  { key: "limpeza_mirante", icon: iconImg(iconLimpezaMirante, "Limpeza no Mirante"), nome: "Limpeza no Mirante", descricao: "Limpeza geral do mirante, incluindo piso, corrimãos, bancos, lixeiras e áreas de circulação." },
  { key: "roco", icon: iconImg(iconRoco, "Roço"), nome: "Roço", descricao: "Roçagem da vegetação ao redor do mirante, trilhas e áreas adjacentes." },
  { key: "reparo_mudas", icon: iconImg(iconReparoMudas, "Reparo de Mudas"), nome: "Reparo de Mudas", descricao: "Verificação e reparo de mudas, troca de tutores, reposição de amarras e cuidados necessários." },
  { key: "adubacao", icon: iconImg(iconAdubacao, "Adubação"), nome: "Adubação", descricao: "Adubação das mudas e áreas verdes conforme necessidade." },
  { key: "lavagem_pipa", icon: iconImg(iconLavagemPipa, "Lavagem com Pipa"), nome: "Lavagem com Pipa", descricao: "Lavagem de pisos, corrimãos, bancos e áreas externas com caminhão pipa." },
  { key: "limpeza_soprador", icon: iconImg(iconLimpezaSoprador, "Limpeza com Soprador"), nome: "Limpeza com Soprador", descricao: "Limpeza de folhas, resíduos e detritos com soprador em toda a área do mirante e acessos." },
];

// Pará UTC-3 today (no time)
function paraToday(): Date {
  const now = new Date();
  const utcMs = now.getTime() - 3 * 60 * 60 * 1000;
  const d = new Date(utcMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDate(ddmm: string): Date | null {
  const m = ddmm.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const today = paraToday();
  let y = m[3] ? parseInt(m[3], 10) : today.getUTCFullYear();
  if (y < 100) y += 2000;
  return new Date(Date.UTC(y, mo, d));
}

function diffDays(target: Date, base: Date): number {
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

export default function CronogramaLimpezaMiranteTab() {
  const [data, setData] = useState<Record<string, DataItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [logo, setLogo] = useState<string>("");
  const [exportDate, setExportDate] = useState<{ d: string; m: string; y: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => paraToday(), []);

  useEffect(() => {
    getLogoBase64().then(setLogo);
  }, []);

  // Load
  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase
        .from("cronograma_mirante" as any)
        .select("atividade_key, datas");
      const map: Record<string, DataItem[]> = {};
      ATIVIDADES.forEach((a) => (map[a.key] = DEFAULT_DATAS.map((d) => ({ ...d }))));
      if (!error && rows) {
        (rows as any[]).forEach((r: any) => {
          if (Array.isArray(r.datas) && r.datas.length) {
            map[r.atividade_key] = r.datas.map((d: any) =>
              typeof d === "string" ? { date: d, done: false } : { date: d.date, done: !!d.done }
            );
          }
        });
      }
      setData(map);
      setLoading(false);
    })();
  }, []);

  const persist = async (key: string, datas: DataItem[]) => {
    const { error } = await supabase
      .from("cronograma_mirante" as any)
      .upsert(
        { atividade_key: key, datas: datas as any },
        { onConflict: "environment,atividade_key" }
      );
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  };

  const updateDate = (key: string, idx: number, value: string) => {
    setData((prev) => {
      const next = { ...prev, [key]: prev[key].map((d, i) => (i === idx ? { ...d, date: value } : d)) };
      return next;
    });
  };

  const commitDate = (key: string) => persist(key, data[key]);

  const toggleDone = (key: string, idx: number) => {
    const next = { ...data, [key]: data[key].map((d, i) => (i === idx ? { ...d, done: !d.done } : d)) };
    setData(next);
    persist(key, next[key]);
  };

  const cellClass = (item: DataItem): string => {
    if (item.done) return "data-cell data-done";
    const d = parseDate(item.date);
    if (!d) return "data-cell";
    const diff = diffDays(d, today);
    if (diff < 0) return "data-cell data-overdue";
    if (diff <= 2) return "data-cell data-reminder";
    return "data-cell";
  };

  const reminderLabel = (item: DataItem): string | null => {
    if (item.done) return null;
    const d = parseDate(item.date);
    if (!d) return null;
    const diff = diffDays(d, today);
    if (diff < 0) return `Atrasado ${Math.abs(diff)}d`;
    if (diff === 0) return "Hoje!";
    if (diff <= 2) return `Em ${diff}d`;
    return null;
  };

  const exportToPdf = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    const now = paraToday();
    setExportDate({
      d: String(now.getUTCDate()).padStart(2, "0"),
      m: String(now.getUTCMonth() + 1).padStart(2, "0"),
      y: String(now.getUTCFullYear()),
    });
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = cardRef.current;
      const fullW = el.scrollWidth;
      const fullH = el.scrollHeight;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: fullW,
        height: fullH,
        windowWidth: fullW,
        windowHeight: fullH,
        scrollX: 0,
        scrollY: 0,
      });
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 6;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const ratio = canvas.width / canvas.height;
      let imgWidth = maxW;
      let imgHeight = imgWidth / ratio;
      if (imgHeight > maxH) {
        imgHeight = maxH;
        imgWidth = imgHeight * ratio;
      }
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
      const blob = pdf.output("blob");
      const stamp = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(blob, `cronograma-mirante-${stamp}.pdf`);
      toast({ title: "PDF gerado", description: "Cronograma exportado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e?.message || "Falha", variant: "destructive" });
    } finally {
      setExporting(false);
      setExportDate(null);
    }
  };

  const exportToPng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    const now = paraToday();
    setExportDate({
      d: String(now.getUTCDate()).padStart(2, "0"),
      m: String(now.getUTCMonth() + 1).padStart(2, "0"),
      y: String(now.getUTCFullYear()),
    });
    try {
      const { default: html2canvas } = await import("html2canvas");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = cardRef.current;
      const fullW = el.scrollWidth;
      const fullH = el.scrollHeight;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: fullW,
        height: fullH,
        windowWidth: fullW,
        windowHeight: fullH,
        scrollX: 0,
        scrollY: 0,
      });
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
      if (!blob) throw new Error("Falha ao gerar imagem");
      const stamp = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(blob, `cronograma-mirante-${stamp}.png`);
      toast({ title: "PNG gerado", description: "Cronograma exportado como imagem." });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e?.message || "Falha", variant: "destructive" });
    } finally {
      setExporting(false);
      setExportDate(null);
    }
  };

  if (loading) {
    return <div className="cronograma-page"><div className="cronograma-card">Carregando...</div></div>;
  }

  return (
    <div className="cronograma-page">
      <div className="flex justify-end gap-2 mb-3 max-w-[980px] mx-auto">
        <Button onClick={exportToPng} disabled={exporting} variant="outline" className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
          Exportar PNG
        </Button>
        <Button onClick={exportToPdf} disabled={exporting} variant="outline" className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>
      <div className="cronograma-card" ref={cardRef}>
        <div className="cronograma-header">
          <div className="logo-mirante">
            {logo ? (
              <img src={logo} alt="Sucena" crossOrigin="anonymous" className="w-full h-full object-contain" />
            ) : (
              <Sprout className="w-12 h-12 text-[#1e572c]" strokeWidth={1.5} />
            )}
          </div>
          <div className="titulo-area">
            <h1>Cronograma de Manutenção</h1>
            <h2>Mirante</h2>
          </div>
        </div>

        <div className="info-box">
          <div className="info-icon">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <div><span className="font-bold">FREQUÊNCIA:</span> A CADA 15 DIAS</div>
            <div><span className="font-bold">PERÍODO:</span> MANUTENÇÃO CONTÍNUA</div>
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
              {ATIVIDADES.map((a) => {
                const items = data[a.key] || DEFAULT_DATAS;
                return (
                  <tr key={a.key}>
                    <td className="col-atividade">
                      <div className="atividade-icon">{a.icon}</div>
                      <div className="atividade-nome">{a.nome}</div>
                    </td>
                    <td className="col-descricao">{a.descricao}</td>
                    <td className="col-frequencia">
                      <RotateCw className="frequencia-icon mx-auto" />
                      A CADA<br />15 DIAS
                    </td>
                    {items.map((item, i) => {
                      const rem = reminderLabel(item);
                      return (
                        <td key={i} className={cellClass(item)}>
                          <input
                            className="data-input"
                            value={item.date}
                            placeholder="dd/mm"
                            onChange={(e) => updateDate(a.key, i, e.target.value)}
                            onBlur={() => commitDate(a.key)}
                          />
                          <div className="data-actions">
                            <button
                              type="button"
                              className="data-toggle"
                              title={item.done ? "Marcar como não feito" : "Marcar como feito"}
                              onClick={() => toggleDone(a.key, i)}
                            >
                              {item.done ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 opacity-50" />}
                            </button>
                          </div>
                          {rem && (
                            <div className="reminder-badge flex items-center justify-center gap-1">
                              <Bell className="w-3 h-3" /> {rem}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="observacoes">
          <strong>Observações:</strong>
          <span>Cronograma sujeito a ajustes conforme condições climáticas e necessidades do local. Datas em amarelo são lembretes (faltam 2 dias ou menos), em verde foram concluídas e em vermelho estão atrasadas.</span>
        </div>

        <div className="assinatura-area">
          <div className="flex-1 flex items-end gap-3">
            <span>RESPONSÁVEL:</span>
            <div className="linha-assinatura relative">
              <img
                src={assinaturaResponsavel}
                alt="Assinatura"
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none"
                style={{ height: 110, width: "auto", objectFit: "contain", bottom: -25 }}
              />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span>DATA:</span>
            <div className="w-12 border-b-2 border-black h-7 flex items-end justify-center font-bold">
              {exportDate?.d || ""}
            </div>
            <span>/</span>
            <div className="w-12 border-b-2 border-black h-7 flex items-end justify-center font-bold">
              {exportDate?.m || ""}
            </div>
            <span>/</span>
            <div className="w-16 border-b-2 border-black h-7 flex items-end justify-center font-bold">
              {exportDate?.y || ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
