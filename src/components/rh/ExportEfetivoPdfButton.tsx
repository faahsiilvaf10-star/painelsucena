import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Colaborador } from "@/data/efetivoData";

interface ExportEfetivoPdfButtonProps {
  colaboradores: Colaborador[];
  filterFuncao?: string;
}

export function ExportEfetivoPdfButton({ colaboradores, filterFuncao }: ExportEfetivoPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (colaboradores.length === 0) {
      toast.error("Nenhum colaborador para exportar");
      return;
    }

    setIsGenerating(true);

    try {
      // Fetch logos
      const [sucenaLogoResponse, hydroLogoResponse] = await Promise.all([
        fetch("/logo-sucena-pdf.png"),
        fetch("/logo-hydro.png").catch(() => null),
      ]);

      let sucenaLogoBase64 = "";
      let hydroLogoBase64 = "";

      if (sucenaLogoResponse.ok) {
        const blob = await sucenaLogoResponse.blob();
        sucenaLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      if (hydroLogoResponse?.ok) {
        const blob = await hydroLogoResponse.blob();
        hydroLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // Group by function for summary
      const funcaoStats: Record<string, number> = {};
      colaboradores.forEach((c) => {
        funcaoStats[c.funcao] = (funcaoStats[c.funcao] || 0) + 1;
      });
      const sortedFuncaoStats = Object.entries(funcaoStats).sort((a, b) => b[1] - a[1]);

      const filterDescription = filterFuncao && filterFuncao !== "all" 
        ? `Função: ${filterFuncao}` 
        : "Todos os colaboradores";

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Efetivo - Quadro de Colaboradores</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #c4c9cf;
              padding: 10px;
              color: #1a1a2e;
              font-size: 10px;
            }
            .container {
              max-width: 100%;
              margin: 0 auto;
              background: #c4c9cf;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
            }
            .logo {
              height: 40px;
              object-fit: contain;
            }
            .title-box {
              background: #f5a623;
              padding: 10px 30px;
              border-radius: 4px;
            }
            .title-box h1 {
              font-size: 16px;
              font-weight: bold;
              color: #1a1a2e;
              white-space: nowrap;
            }
            .filter-info {
              background: #2d2d44;
              color: white;
              padding: 8px 20px;
              border-radius: 8px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .summary-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-bottom: 15px;
            }
            .summary-card {
              background: #2d2d44;
              border-radius: 6px;
              padding: 10px 15px;
              border: 1px solid #3d3d5c;
              min-width: 100px;
            }
            .summary-card h3 {
              color: #9ca3af;
              font-size: 9px;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .summary-card .value {
              color: #22d3ee;
              font-size: 18px;
              font-weight: bold;
            }
            .section {
              background: #2d2d44;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 15px;
              border: 1px solid #3d3d5c;
            }
            .section-title {
              color: white;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              background: #1a1a2e;
              color: #9ca3af;
              padding: 8px 6px;
              text-align: left;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
            }
            td {
              padding: 6px;
              border-bottom: 1px solid #3d3d5c;
              color: white;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background: rgba(0,0,0,0.1);
            }
            .funcao-badge {
              background: #3d3d5c;
              color: #22d3ee;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 8px;
              display: inline-block;
            }
            .footer {
              background: #f5a623;
              padding: 8px 15px;
              border-radius: 8px 8px 0 0;
              margin-top: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9px;
            }
            .footer-left, .footer-right {
              color: #1a1a2e;
            }
            .footer-center {
              color: #1a1a2e;
              text-align: center;
            }
            .funcao-summary {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
              gap: 8px;
            }
            .funcao-item {
              background: #1a1a2e;
              padding: 6px 10px;
              border-radius: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .funcao-item .name {
              color: #9ca3af;
              font-size: 8px;
              max-width: 80%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .funcao-item .count {
              color: #22d3ee;
              font-weight: bold;
              font-size: 11px;
            }
            @media print {
              body {
                background: white;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .container {
                background: #c4c9cf;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              ${sucenaLogoBase64 ? `<img src="${sucenaLogoBase64}" class="logo" alt="Sucena" />` : "<div></div>"}
              <div class="title-box">
                <h1>Quadro de Efetivo - Colaboradores</h1>
              </div>
              ${hydroLogoBase64 ? `<img src="${hydroLogoBase64}" class="logo" alt="Hydro" />` : "<div></div>"}
            </div>

            <!-- Filter Info -->
            <div class="filter-info">
              <span><strong>Filtro:</strong> ${filterDescription}</span>
              <span><strong>Total:</strong> ${colaboradores.length} colaboradores</span>
            </div>

            <!-- Function Summary -->
            <div class="section">
              <div class="section-title">Resumo por Função</div>
              <div class="funcao-summary">
                ${sortedFuncaoStats.map(([funcao, count]) => `
                  <div class="funcao-item">
                    <span class="name" title="${funcao}">${funcao}</span>
                    <span class="count">${count}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Employee Table -->
            <div class="section">
              <div class="section-title">Lista de Colaboradores</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 30px;">#</th>
                    <th>Nome</th>
                    <th>Função</th>
                    <th style="width: 80px;">Matrícula</th>
                    <th style="width: 100px;">CPF</th>
                    <th style="width: 80px;">Admissão</th>
                    <th style="width: 80px;">Nascimento</th>
                    <th style="width: 100px;">Contato</th>
                    <th>Localidade</th>
                  </tr>
                </thead>
                <tbody>
                  ${colaboradores.map((c, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td><strong>${c.nome}</strong></td>
                      <td><span class="funcao-badge">${c.funcao}</span></td>
                      <td>${c.matricula}</td>
                      <td>${c.cpf}</td>
                      <td>${c.admissao}</td>
                      <td>${c.dataNascimento}</td>
                      <td>${c.contato || "-"}</td>
                      <td>${c.localidade}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-left">
                <div>📷 sucenaempreendimentos</div>
                <div>🔗 sucenaempreendimentos.com.br</div>
              </div>
              <div class="footer-center">
                Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div class="footer-right">
                <div>📧 contato@sucenaempreendimentos.com.br</div>
                <div>📍 Brasil</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Exportar PDF
    </Button>
  );
}
