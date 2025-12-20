// Baserow API Types and Service

const API_URL = "https://api.baserow.io/api";
const TOKEN = "x3JhLgiECULSREjT6yt54FohKeKbUiSF";

// Table IDs
const TABLES = {
  CONTENTS: 106744,
  EPISODES: 106745,
  BANNERS: 224159,
  USERS: 189557,
  CATEGORIES: 224166,
};

// Types
export interface User {
  id: number;
  order: string;
  Nome: string;
  Email: string;
  Senha: string;
  Data: string;
  Pagamento: string;
  Hoje: string;
  Dias: number;
  Logins: number;
  IMEI: string;
  Restam: string;
}

export interface Content {
  id: number;
  order: string;
  Nome: string;
  Capa: string;
  Sinopse: string;
  Categoria: string;
  Views: number;
  Tipo: string;
  Data: string;
  Link: string;
  Idioma: string;
  Favoritos: string;
  Temporadas: number;
  Histórico: string;
  Edição: string;
}

export interface Banner {
  id: number;
  order: string;
  Nome: string;
  Imagem: string;
  ID: number;
  Link: string;
  "Externo?": boolean;
  Data: string;
  Categoria: string;
}

export interface Episode {
  id: number;
  order: string;
  Nome: string;
  Link: string;
  Data: string;
  Temporada: number;
  "Episódio": number;
  Histórico: string;
}

export interface Category {
  id: number;
  order: string;
  Nome: string;
}

export interface DeviceInfo {
  IMEI: string;
  Dispositivo: string;
}

interface BaserowResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Headers
const getHeaders = () => ({
  Authorization: `Token ${TOKEN}`,
  "Content-Type": "application/json",
});

// Generic fetch function
async function fetchFromBaserow<T>(
  tableId: number,
  params: Record<string, string> = {}
): Promise<BaserowResponse<T>> {
  const queryParams = new URLSearchParams(params);
  const url = `${API_URL}/database/rows/table/${tableId}/?user_field_names=true&${queryParams}`;
  
  const response = await fetch(url, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Baserow API error: ${response.status}`);
  }
  
  return response.json();
}

// Update row function
async function updateRow<T>(
  tableId: number,
  rowId: number,
  data: Partial<T>
): Promise<T> {
  const url = `${API_URL}/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
  
  const response = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Baserow API error: ${response.status}`);
  }
  
  return response.json();
}

// Parse IMEI field to get device array
export function parseIMEIField(imeiString: string): DeviceInfo[] {
  if (!imeiString || imeiString.trim() === "") {
    return [];
  }
  
  // Match all JSON objects in the string
  const regex = /\{[^}]+\}/g;
  const matches = imeiString.match(regex);
  
  if (!matches) {
    return [];
  }
  
  const devices: DeviceInfo[] = [];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match);
      if (parsed.IMEI && parsed.Dispositivo) {
        devices.push(parsed);
      }
    } catch {
      // Skip invalid JSON
    }
  }
  
  return devices;
}

// Generate current device IMEI
export function getCurrentDeviceIMEI(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform || "Unknown";
  
  // Create a simple device identifier
  const imei = `${platform}:${userAgent.slice(0, 50)}`;
  const dispositivo = platform;
  
  return {
    IMEI: imei,
    Dispositivo: dispositivo,
  };
}

// User API
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
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) return null;
    return response.json();
  },
};

// Content API
export const contentApi = {
  async getRecent(limit = 20): Promise<Content[]> {
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, {
      order_by: "-Data",
      size: limit.toString(),
    });
    return response.results;
  },
  
  async getMostWatched(limit = 20): Promise<Content[]> {
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, {
      order_by: "-Views",
      size: limit.toString(),
    });
    return response.results;
  },
  
  async getById(id: number): Promise<Content | null> {
    const url = `${API_URL}/database/rows/table/${TABLES.CONTENTS}/${id}/?user_field_names=true`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) return null;
    return response.json();
  },
  
  async search(query: string, orderBy = "-Data"): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "OR",
      filters: [
        { type: "contains", field: "Nome", value: query },
        { type: "contains", field: "Categoria", value: query },
      ],
      groups: [],
    });
    
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, {
      filters,
      order_by: orderBy,
    });
    return response.results;
  },
  
  async getByCategory(category: string, orderBy = "-Data"): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "contains", field: "Categoria", value: category }],
      groups: [],
    });
    
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, {
      filters,
      order_by: orderBy,
    });
    return response.results;
  },
  
  async getByType(type: string): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "equal", field: "Tipo", value: type }],
      groups: [],
    });
    
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { 
      filters,
      order_by: "-Data",
    });
    return response.results;
  },

  async getRecentByType(type: string, limit = 10): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "equal", field: "Tipo", value: type }],
      groups: [],
    });
    
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, { 
      filters,
      order_by: "-Data",
      size: limit.toString(),
    });
    return response.results;
  },

  async incrementViews(id: number, currentViews: number): Promise<void> {
    const newViews = (Number(currentViews) || 0) + 1;
    await updateRow(TABLES.CONTENTS, id, { Views: newViews });
  },
  
  async getAll(orderBy = "-Data"): Promise<Content[]> {
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, {
      order_by: orderBy,
      size: "100",
    });
    return response.results;
  },
  
  async getFavorites(userEmail: string): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "contains", field: "Favoritos", value: userEmail }],
      groups: [],
    });
    
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, {
      filters,
      order_by: "-Data",
    });
    return response.results;
  },
  
  async getHistory(userEmail: string): Promise<Content[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [{ type: "contains", field: "Histórico", value: userEmail }],
      groups: [],
    });
    
    const response = await fetchFromBaserow<Content>(TABLES.CONTENTS, {
      filters,
      order_by: "-Edição",
    });
    return response.results;
  },
  
  async addFavorite(id: number, currentFavorites: string | null, userEmail: string): Promise<void> {
    const userEntry = `{"id":"${userEmail}"}`;
    const favorites = currentFavorites || "";
    
    // Check if already favorited
    if (favorites.includes(userEmail)) {
      return;
    }
    
    const newFavorites = favorites + userEntry;
    await updateRow(TABLES.CONTENTS, id, { Favoritos: newFavorites });
  },
  
  async removeFavorite(id: number, currentFavorites: string | null, userEmail: string): Promise<void> {
    if (!currentFavorites) return;
    
    const userEntry = `{"id":"${userEmail}"}`;
    const newFavorites = currentFavorites.replace(userEntry, "");
    await updateRow(TABLES.CONTENTS, id, { Favoritos: newFavorites });
  },
  
  async addToHistory(id: number, currentHistory: string | null, userEmail: string): Promise<void> {
    const userEntry = `{"id":"${userEmail}"}`;
    const history = currentHistory || "";
    
    // Check if already in history
    if (history.includes(userEmail)) {
      return;
    }
    
    const newHistory = history + userEntry;
    await updateRow(TABLES.CONTENTS, id, { Histórico: newHistory });
  },
  
  isFavorite(favorites: string | null, userEmail: string): boolean {
    if (!favorites) return false;
    return favorites.includes(userEmail);
  },
};

// Banner API
export const bannerApi = {
  async getAll(): Promise<Banner[]> {
    const response = await fetchFromBaserow<Banner>(TABLES.BANNERS, {
      order_by: "-Data",
    });
    return response.results;
  },
};

// Episode API
export const episodeApi = {
  async getByContentAndSeason(nome: string, temporada: number): Promise<Episode[]> {
    const filters = JSON.stringify({
      filter_type: "AND",
      filters: [
        { type: "equal", field: "Nome", value: nome },
        { type: "equal", field: "Temporada", value: temporada.toString() },
      ],
      groups: [],
    });
    
    const response = await fetchFromBaserow<Episode>(TABLES.EPISODES, {
      filters,
      order_by: "Episódio",
    });
    return response.results;
  },
  
  async incrementViews(id: number, currentViews: number): Promise<void> {
    const newViews = (Number(currentViews) || 0) + 1;
    await updateRow(TABLES.EPISODES, id, { Views: newViews });
  },
};

// Category API
export const categoryApi = {
  async getAll(): Promise<Category[]> {
    const response = await fetchFromBaserow<Category>(TABLES.CATEGORIES, {});
    return response.results;
  },
};
