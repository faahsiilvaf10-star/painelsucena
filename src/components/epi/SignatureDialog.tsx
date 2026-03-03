import { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Check, ArrowRight } from "lucide-react";

interface SignatureCanvasProps {
  label: string;
  onSignatureChange: (dataUrl: string) => void;
}

function SignatureCanvas({ label, onSignatureChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    return ctx;
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onSignatureChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onSignatureChange("");
  };

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const width = container.clientWidth;
      canvas.width = Math.max(width * 2, 400);
      canvas.height = Math.max(width * 0.6, 180);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-xs">
          <Eraser className="h-3 w-3" /> Limpar
        </Button>
      </div>
      <div className="relative rounded-md border-2 border-dashed border-border bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ height: "clamp(180px, 35vw, 220px)" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        <div className="absolute bottom-3 left-4 right-4 border-b border-muted-foreground/30 pointer-events-none" />
        <span className="absolute bottom-1 left-4 text-[10px] text-muted-foreground/50 pointer-events-none">
          Assine acima da linha
        </span>
      </div>
    </div>
  );
}

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (sigFuncionario: string, sigAutorizador: string) => void;
}

export function SignatureDialog({ open, onClose, onConfirm }: SignatureDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [sigAutorizador, setSigAutorizador] = useState("");
  const [sigFuncionario, setSigFuncionario] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setSigAutorizador("");
      setSigFuncionario("");
    }
  }, [open]);

  const handleNext = () => {
    setStep(2);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {step === 1 ? "Assinatura do Autorizador (1/2)" : "Assinatura do Funcionário (2/2)"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {step === 1 ? (
            <>
              <SignatureCanvas
                key="autorizador"
                label="Assinatura do Autorizador"
                onSignatureChange={setSigAutorizador}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
                <Button
                  onClick={handleNext}
                  disabled={!sigAutorizador}
                  className="gap-1"
                  size="sm"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <SignatureCanvas
                key="funcionario"
                label="Assinatura do Funcionário"
                onSignatureChange={setSigFuncionario}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>Voltar</Button>
                <Button
                  onClick={() => onConfirm(sigFuncionario, sigAutorizador)}
                  disabled={!sigFuncionario}
                  className="gap-1"
                  size="sm"
                >
                  <Check className="h-4 w-4" /> Confirmar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
