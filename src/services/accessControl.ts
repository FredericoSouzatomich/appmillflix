// Access Control Service - Verifica se o app está ativo via proxy
const PROXY_URL = "https://api-anyflix.vercel.app/api/check";

// UUID de acesso - pode ser alterado aqui
let ACCESS_UUID = "5f5641dd-0d9a-4b1a-bbbd-383dabaaf70e";

export interface AccessResponse {
  uuid: string;
  ativo: boolean;
  message?: string;
}

export const setAccessUUID = (uuid: string) => {
  ACCESS_UUID = uuid;
};

export const getAccessUUID = () => ACCESS_UUID;

export const checkAccess = async (): Promise<AccessResponse> => {
  try {
    const response = await fetch(`${PROXY_URL}?token=${ACCESS_UUID}`);
    
    if (!response.ok) {
      return { uuid: ACCESS_UUID, ativo: false, message: "Erro ao verificar acesso" };
    }
    
    const data: AccessResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao verificar acesso:", error);
    return { uuid: ACCESS_UUID, ativo: false, message: "Erro de conexão" };
  }
};
