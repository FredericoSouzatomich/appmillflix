import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { parseIMEIField, userApi, DeviceInfo } from "@/services/baserow";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  Smartphone, 
  Trash2, 
  Shield, 
  LogOut,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, deviceInfo } = useAuth();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (user?.IMEI) {
      const parsed = parseIMEIField(user.IMEI);
      setDevices(parsed);
    }
  }, [user]);

  const handleRemoveDevice = async (device: DeviceInfo) => {
    if (!user) return;
    
    // Don't allow removing current device
    if (device.IMEI === deviceInfo.IMEI || device.Dispositivo === deviceInfo.Dispositivo) {
      toast({
        title: "Não é possível remover",
        description: "Você não pode remover o dispositivo atual. Use 'Sair' para desconectar.",
        variant: "destructive",
      });
      return;
    }

    setIsRemoving(device.IMEI);
    
    try {
      const updatedDevices = devices.filter(
        (d) => d.IMEI !== device.IMEI || d.Dispositivo !== device.Dispositivo
      );
      const newIMEIString = updatedDevices.map((d) => JSON.stringify(d)).join("");
      await userApi.updateIMEI(user.id, newIMEIString);
      setDevices(updatedDevices);
      
      toast({
        title: "Dispositivo removido",
        description: `${device.Dispositivo} foi desconectado com sucesso.`,
      });
    } catch (error) {
      console.error("Error removing device:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o dispositivo.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const parseRestam = (restam: string): { days: number; time: string } => {
    const match = restam.match(/(\d+)\s*days?\s*([\d:]+)/i);
    if (match) {
      return { days: parseInt(match[1], 10), time: match[2] };
    }
    return { days: 0, time: restam };
  };

  if (!user) {
    return null;
  }

  const { days, time } = parseRestam(user.Restam || "0 days");
  const isCurrentDevice = (device: DeviceInfo) => 
    device.IMEI === deviceInfo.IMEI || device.Dispositivo === deviceInfo.Dispositivo;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="tv-focus">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* User Info Card */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{user.Nome}</h2>
              <p className="text-muted-foreground">{user.Email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subscription Days */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Dias Restantes</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{days}</p>
              <p className="text-xs text-muted-foreground">dias</p>
            </div>

            {/* Time Remaining */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Tempo</span>
              </div>
              <p className="text-xl font-bold text-foreground">{time}</p>
              <p className="text-xs text-muted-foreground">restante</p>
            </div>

            {/* Device Limit */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Dispositivos</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {devices.length}/{user.Logins || 1}
              </p>
              <p className="text-xs text-muted-foreground">conectados</p>
            </div>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-foreground">Dispositivos Conectados</h3>
          </div>

          <div className="space-y-3">
            {devices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum dispositivo conectado
              </p>
            ) : (
              devices.map((device, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    isCurrentDevice(device)
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCurrentDevice(device) ? "bg-primary/20" : "bg-background"
                    }`}>
                      <Smartphone className={`w-5 h-5 ${
                        isCurrentDevice(device) ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {device.Dispositivo}
                        {isCurrentDevice(device) && (
                          <span className="ml-2 text-xs text-primary">(Este dispositivo)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {device.IMEI.slice(0, 40)}...
                      </p>
                    </div>
                  </div>
                  
                  {!isCurrentDevice(device) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDevice(device)}
                      disabled={isRemoving === device.IMEI}
                      className="tv-focus text-muted-foreground hover:text-destructive"
                    >
                      {isRemoving === device.IMEI ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-xl font-bold text-foreground mb-4">Informações da Assinatura</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-muted-foreground">Data de Início:</div>
            <div className="text-foreground font-medium">{user.Data}</div>
            
            <div className="text-muted-foreground">Último Pagamento:</div>
            <div className="text-foreground font-medium">{user.Pagamento}</div>
            
            <div className="text-muted-foreground">Plano (dias):</div>
            <div className="text-foreground font-medium">{user.Dias} dias</div>
            
            <div className="text-muted-foreground">Limite de Dispositivos:</div>
            <div className="text-foreground font-medium">{user.Logins || 1} dispositivo(s)</div>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="destructive"
          size="lg"
          onClick={handleLogout}
          className="w-full tv-focus"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sair da Conta
        </Button>
      </main>
    </div>
  );
};

export default Profile;
