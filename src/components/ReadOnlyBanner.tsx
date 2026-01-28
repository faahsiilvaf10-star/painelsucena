import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReadOnlyBannerProps {
  message?: string;
}

export const ReadOnlyBanner = ({ 
  message = "Você está visualizando esta página em modo somente leitura." 
}: ReadOnlyBannerProps) => {
  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-amber-600 dark:text-amber-400">
        {message}
      </AlertDescription>
    </Alert>
  );
};
