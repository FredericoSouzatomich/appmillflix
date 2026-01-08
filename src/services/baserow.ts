// --- Configurações Principais ---

// Se mudar para http://, o script usará o proxy da Vercel automaticamente
const API_URL = "http://213.199.56.115/api"; 
const TOKEN = "VSquNvsgy2AmQvMpPmcSlajE1r04pUo6";
const PROXY_URL = "https://api-anyflix.vercel.app/api/baserow";

// IDs das Tabelas
const TABLES = {
  CONTENTS: 4241,
  EPISODES: 4251,
  BANNERS: 4244,
  USERS: 4250,
  CATEGORIES: 4243,
};

// --- Interfaces ---
// (Mantidas conforme seu original)

export interface User { id: number; order: string; Nome: string; Email: string; Senha: string; Data: string; Pagamento: string; Hoje: string; Dias: number; Logins: number; IMEI: string; Restam: string; }
export interface Content { id: number; order: string; Nome: string; Capa: string; Sinopse: string; Categoria: string; Views: number; Tipo: string; Data: string; Link: string; Idioma: string; Favoritos: string; Temporadas: number; Histórico: string; Edição: string; }
export interface Banner { id: number; order: string; Nome: string; Imagem: string; ID: number; Link: string; "Externo?": boolean; Data: string; Categoria: string; }
export interface Episode { id: number; order: string; Nome: string; Link: string; Data: string; Temporada: number; "Episódio": number; Histórico: string; Views: number; }
export interface Category { id: number; order: string; Nome: string; }
export interface DeviceInfo { IMEI: string; Dispositivo: string; }
interface BaserowResponse<T> { count: number; next: string | null; previous: string | null; results: T[]; }

// --- Motor de Requisições (Compatível com seu Proxy Vercel) ---

function useProxy(url: string): boolean {
  // Ativa o proxy apenas se a URL do Baserow for HTTP (sem S)
  return url.startsWith("http://") && !url.startsWith("https://");
}

async function performRequest<T>(fullUrl: string, method: string = "GET", body?: any): Promise<T> {
  let fetchUrl: string;
  let fetchOptions: RequestInit;

  if (useProxy(API_URL)) {
    // 1. O Proxy recebe URL, Token e Method via Query String
    const encodedUrl = encodeURIComponent(fullUrl);
    fetchUrl = `${PROXY_URL}?token=${TOKEN}&url=${encodedUrl}&method=${method}`;
    
    // 2. O Proxy recebe os dados (body) via POST para preencher o req.body
    fetchOptions = {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      // Mesmo que o método original seja GET, enviamos POST ao proxy para levar o corpo se houver
      body: body ? JSON.stringify(body) : undefined,
    };
  } else {
    // Conexão direta padrão
    fetchUrl = fullUrl;
    fetchOptions = {
      method: method,
      headers: {
        Authorization: `Token ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    };
  }

  const response = await fetch(fetchUrl, fetchOptions);
  
  if (!response.ok) {
    throw new Error(`Baserow API error: ${response.status}`);
  }
  
  // Tratamento para respostas vazias (ex: DELETE 204)
  if (response.status === 204) return {} as T;

  return response.json();
}

// --- Funções Auxiliares Genéricas ---

async function fetchFromBaserow<T>(
  tableId: number,
  params: Record<string, string> = {}
): Promise<BaserowResponse<T>> {
  const queryParams = new URLSearchParams(params);
  const url = `${API_URL}/database/rows/table/${tableId}/?user_field_names=true&${queryParams}`;
  return performRequest<BaserowResponse<T>>(url, "GET");
}

async function updateRow<T>(
  tableId: number,
  rowId: number,
  data: Partial<T>
): Promise<T> {
  const url = `${API_URL}/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
  return performRequest<T>(url, "PATCH", data);
}

// --- Utilitários ---

export function parseIMEIField(imeiString: string): DeviceInfo[] {
  if (!imeiString || imeiString.trim() === "") return [];
  const matches = imeiString.match(/\{[^}]+\}/g);
  if (!matches) return [];
  return matches.map(m => {
    try { return JSON.parse(m); } catch { return null; }
  }).filter(d => d && d.IMEI);
}

export function getCurrentDeviceIMEI(): DeviceInfo {
  const platform = navigator.platform || "Unknown";
  return { IMEI: `${platform}:${navigator.userAgent.slice(0, 50)}`, Dispositivo: platform };
}

// --- APIs de Negócio ---

export const userApi = {
  async findByEmail(email: string): Promise<User | null> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "equal", field: "Email", value: email }],
      groups: [],
    });
    const response = await fetchFromBaserow<User>(TABLES.USERS, { filters });
    return response.results[0] || null;
  },
  async updateIMEI(userId: number, imeiString: string): Promise<User> {
    return updateRow<User>(TABLES.USERS, userId, { IMEI: imeiString });
  },
  async getById(userId: number): Promise<User | null> {
    const url = `${API_URL}/database/rows/table/${TABLES.USERS}/${userId}/?user_field_names=true`;
    try { return await performRequest<User>(url, "GET"); } catch { return null; }
  }
};

export const contentApi = {
  async getAll(orderBy = "-Data"): Promise<Content[]> {
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { order_by: orderBy });
    return response.results;
  },
  async getById(id: number): Promise<Content | null> {
    const url = `${API_URL}/database/rows/table/${TABLES.CONTENTS}/${id}/?user_field_names=true`;
    try { return await performRequest<Content>(url, "GET"); } catch { return null; }
  },
  async getRecent(limit = 20): Promise<Content[]> {
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { order_by: "-Data", size: limit.toString() });
    return response.results;
  },
  async getRecentByType(type: string, limit = 20): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "equal", field: "Tipo", value: type }],
      groups: [],
    });
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { filters, order_by: "-Data", size: limit.toString() });
    return response.results;
  },
  async getMostWatched(limit = 20): Promise<Content[]> {
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { order_by: "-Views", size: limit.toString() });
    return response.results;
  },
  async getByCategory(category: string): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "contains", field: "Categoria", value: category }],
      groups: [],
    });
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { filters, order_by: "-Data" });
    return response.results;
  },
  async getByType(type: string): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "equal", field: "Tipo", value: type }],
      groups: [],
    });
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { filters, order_by: "-Data" });
    return response.results;
  },
  async search(query: string, orderBy = "-Data"): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "OR",
      filters: [{ type: "contains", field: "Nome", value: query }, { type: "contains", field: "Categoria", value: query }],
      groups: [],
    });
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { filters, order_by: orderBy });
    return response.results;
  },
  async incrementViews(id: number, currentViews: number): Promise<void> {
    await updateRow(TABLES.CONTENTS, id, { Views: (Number(currentViews) || 0) + 1 });
  },
  async addFavorite(id: number, currentFavorites: string | null, userEmail: string): Promise<void> {
    if (currentFavorites?.includes(userEmail)) return;
    const userEntry = `{"id":"${userEmail}"}`;
    await updateRow(TABLES.CONTENTS, id, { Favoritos: (currentFavorites || "") + userEntry });
  },
  async removeFavorite(id: number, currentFavorites: string | null, userEmail: string): Promise<void> {
    if (!currentFavorites) return;
    const userEntry = `{"id":"${userEmail}"}`;
    const newFavorites = currentFavorites.replace(userEntry, "");
    await updateRow(TABLES.CONTENTS, id, { Favoritos: newFavorites });
  },
  async getFavorites(userEmail: string): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "contains", field: "Favoritos", value: userEmail }],
      groups: [],
    });
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { filters, order_by: "-Data" });
    return response.results;
  },
  isFavorite(favoritosField: string | null, userEmail: string): boolean {
    return favoritosField?.includes(userEmail) || false;
  },
  async addToHistory(id: number, currentHistory: string | null, userEmail: string): Promise<void> {
    if (currentHistory?.includes(userEmail)) return;
    const userEntry = `{"id":"${userEmail}"}`;
    await updateRow(TABLES.CONTENTS, id, { Histórico: (currentHistory || "") + userEntry });
  }
};

export const bannerApi = {
  async getAll(): Promise<Banner[]> {
    const response = await fetchFromBaserow<Banner>(TABLES.BANNERS, { order_by: "-Data" });
    return response.results;
  }
};

export const episodeApi = {
  async getByContentAndSeason(nome: string, temporada: number): Promise<Episode[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [
        { type: "equal", field: "Nome", value: nome }, 
        { type: "equal", field: "Temporada", value: temporada }
      ],
      groups: [],
    });
    const response = await fetchFromBaserow<Episode>(TABLES.EPISODES, { filters, order_by: "Episódio" });
    return response.results;
  }
};

export const categoryApi = {
  async getAll(): Promise<Category[]> {
    const response = await fetchFromBaserow<Category>(TABLES.CATEGORIES, {});
    return response.results;
  }
};
