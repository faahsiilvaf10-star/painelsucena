import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Order, OrderStatus, QuantityUnit } from "@/hooks/useOrders";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCargoLabel } from "@/lib/cargoUtils";
import logoPrincipal from "@/assets/logo-principal.png";

interface ExportOrderPdfButtonProps {
  order: Order;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  solicitado: { label: "Solicitado", color: "#EAB308" },
  aprovado: { label: "Aprovado", color: "#3B82F6" },
  a_caminho: { label: "A Caminho", color: "#8B5CF6" },
  entregue: { label: "Entregue", color: "#22C55E" },
  cancelado: { label: "Cancelado", color: "#EF4444" },
};

const UNIT_LABELS: Record<string, string> = {
  unidade: "Unidade(s)",
  par: "Par(es)",
  pecas: "Peça(s)",
  centimetros: "Centímetros",
  metros: "Metros",
  metro_quadrado: "m² (Metro Quadrado)",
  metro_cubico: "m³ (Metro Cúbico)",
  quilos: "Quilos",
  litros: "Litros",
  galao: "Galão(ões)",
  balde: "Balde(s)",
  pacotes: "Pacotes",
  caixas: "Caixas",
  saco: "Saco(s)",
  rolo: "Rolo(s)",
};

export function ExportOrderPdfButton({ order }: ExportOrderPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { settings } = useSiteSettings();

  const generatePdf = async () => {
    setIsGenerating(true);

    try {
      // Get logo URL - prefer site settings logo, fallback to default
      const logoUrl = settings.logo_url || logoPrincipal;
      
      // Convert logo to base64 for embedding in PDF
      let logoBase64 = "";
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        // If logo fails to load, continue without it
        console.warn("Failed to load logo for PDF");
      }

      const statusConfig = STATUS_CONFIG[order.status];
      const unitLabel = UNIT_LABELS[order.quantity_unit] || order.quantity_unit;
      const isCancelled = order.status === "cancelado";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Pedido ${order.order_number}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #333;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              margin-bottom: 30px;
            }
            .logo {
              max-height: 80px;
              max-width: 200px;
              object-fit: contain;
            }
            .header-info {
              text-align: right;
            }
            .header-info h1 {
              font-size: 24pt;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .order-number {
              font-size: 14pt;
              color: #6b7280;
              font-family: monospace;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              color: white;
              font-weight: bold;
              font-size: 11pt;
              background-color: ${statusConfig.color};
              margin-top: 10px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 11pt;
              text-transform: uppercase;
              color: #6b7280;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
              font-weight: 600;
            }
            .section-content {
              font-size: 14pt;
              color: #1f2937;
              ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}
            }
            .product-name {
              font-size: 18pt;
              font-weight: bold;
              color: #1f2937;
              ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}
            }
            .description {
              font-size: 12pt;
              color: #6b7280;
              margin-top: 8px;
              ${isCancelled ? 'text-decoration: line-through;' : ''}
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 20px;
            }
            .info-item {
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
            }
            .info-label {
              font-size: 10pt;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 13pt;
              color: #1f2937;
              font-weight: 500;
            }
            .quantity-box {
              background: #eff6ff;
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .quantity-value {
              font-size: 28pt;
              font-weight: bold;
              color: #1e40af;
              ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}
            }
            .quantity-unit {
              font-size: 12pt;
              color: #6b7280;
              margin-top: 5px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 10pt;
            }
            .notes-box {
              background: #fefce8;
              border: 1px solid #fde047;
              border-radius: 8px;
              padding: 15px;
              margin-top: 20px;
            }
            .notes-title {
              font-weight: bold;
              color: #854d0e;
              margin-bottom: 5px;
            }
            .notes-content {
              color: #713f12;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : '<div></div>'}
            <div class="header-info">
              <h1>PEDIDO</h1>
              <div class="order-number">#${order.order_number}</div>
              <div class="status-badge">${statusConfig.label}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Produto</div>
            <div class="product-name">${order.product_name}</div>
            ${order.description ? `<div class="description">${order.description}</div>` : ''}
          </div>

          <div class="quantity-box">
            <div class="quantity-value">${order.quantity}</div>
            <div class="quantity-unit">${unitLabel}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Solicitante</div>
              <div class="info-value">${order.requester_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Data da Solicitação</div>
              <div class="info-value">${format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
            </div>
            ${order.expected_date ? `
              <div class="info-item">
                <div class="info-label">Previsão de Entrega</div>
                <div class="info-value">${format(new Date(order.expected_date), "dd/MM/yyyy", { locale: ptBR })}</div>
              </div>
            ` : ''}
            ${order.mentioned_cargo ? `
              <div class="info-item">
                <div class="info-label">Encaminhado para</div>
                <div class="info-value">${formatCargoLabel(order.mentioned_cargo)}</div>
              </div>
            ` : ''}
          </div>

          ${order.notes ? `
            <div class="notes-box">
              <div class="notes-title">Observações</div>
              <div class="notes-content">${order.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </body>
        </html>
      `;

      // Open print dialog with the generated HTML
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for images to load then trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={generatePdf}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Gerar PDF para Impressão</TooltipContent>
    </Tooltip>
  );
}
