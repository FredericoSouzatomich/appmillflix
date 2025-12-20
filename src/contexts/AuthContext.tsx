import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, userApi, parseIMEIField, getCurrentDeviceIMEI, DeviceInfo } from "@/services/baserow";

interface AuthContextType {
  user: User | null;
  deviceInfo: DeviceInfo;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkSubscription: () => boolean;
  checkDeviceConnected: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo] = useState<DeviceInfo>(getCurrentDeviceIMEI());

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("streamtv_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch {
        localStorage.removeItem("streamtv_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Find user by email
      const foundUser = await userApi.findByEmail(email);
      
      if (!foundUser) {
        return { success: false, error: "Email não encontrado" };
      }
      
      // Check password
      if (foundUser.Senha !== password) {
        return { success: false, error: "Senha incorreta" };
      }
      
      // Parse devices and check limit
      const devices = parseIMEIField(foundUser.IMEI);
      const deviceLimit = foundUser.Logins || 1;
      
      // Check if current device is already registered
      const isDeviceRegistered = devices.some(
        (d) => d.IMEI === deviceInfo.IMEI || d.Dispositivo === deviceInfo.Dispositivo
      );
      
      if (!isDeviceRegistered) {
        // Check if we can add a new device
        if (devices.length >= deviceLimit) {
          return {
            success: false,
            error: `Limite de ${deviceLimit} dispositivo(s) atingido. Remova um dispositivo para continuar.`,
          };
        }
        
        // Add current device
        devices.push(deviceInfo);
        const newIMEIString = devices.map((d) => JSON.stringify(d)).join("");
        await userApi.updateIMEI(foundUser.id, newIMEIString);
        foundUser.IMEI = newIMEIString;
      }
      
      // Store user session
      setUser(foundUser);
      localStorage.setItem("streamtv_user", JSON.stringify(foundUser));
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Erro ao fazer login. Tente novamente." };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("streamtv_user");
  };

  const checkSubscription = (): boolean => {
    if (!user) return false;
    
    // Parse "Restam" field to extract the number of remaining days
    const restam = user.Restam;
    const dias = user.Dias;
    
    if (!restam || !dias) return false;
    
    // Extract number from "Restam" (e.g., "15d 3:45:00" -> 15, or "15 dias" -> 15)
    const dayMatch = restam.match(/(-?\d+)/);
    if (!dayMatch) return false;
    
    const restamValue = parseInt(dayMatch[1], 10);
    
    // If Restam - Dias <= Dias, login is active
    // This means: Restam <= 2 * Dias
    const isActive = (restamValue - dias) <= dias;
    
    return isActive;
  };

  const checkDeviceConnected = (): boolean => {
    if (!user) return false;
    
    const devices = parseIMEIField(user.IMEI);
    return devices.some(
      (d) => d.IMEI === deviceInfo.IMEI || d.Dispositivo === deviceInfo.Dispositivo
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        deviceInfo,
        isLoading,
        login,
        logout,
        checkSubscription,
        checkDeviceConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
