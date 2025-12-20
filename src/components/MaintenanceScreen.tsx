import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceScreenProps {
  onRetry: () => void;
  isLoading?: boolean;
}

export function MaintenanceScreen({ onRetry, isLoading }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Sistema em Manutenção
          </h1>
          <p className="text-muted-foreground">
            Estamos realizando melhorias no sistema. Por favor, tente novamente mais tarde.
          </p>
        </div>
        
        <Button 
          onClick={onRetry} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
