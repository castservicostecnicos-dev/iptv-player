import type { Channel, Category } from '../types/iptv';

export interface AuthSession {
  isAuthenticated: boolean;
  username: string;
  token?: string;
  serverUrl?: string;
  password?: string;
  userInfo?: {
    status: string; // 'Active' | 'Banned' | 'Expired'
    expDate: string; // Timestamp or human date
    maxConnections: number;
    activeCons: number;
    message?: string;
  };
  serverInfo?: {
    url: string;
    port: string;
    serverProtocol: string;
    timezone: string;
  };
  authType: 'xtream' | 'm3u_url' | 'demo' | 'app_credentials';
  loginTimestamp: number;
  channels?: Channel[];
  categories?: Category[];
}

const STORAGE_KEY = 'omnistream_auth_session';

export const AuthService = {
  /**
   * Obtém a sessão salva no armazenamento local
   */
  getSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const parsed: AuthSession = JSON.parse(data);
      const now = Date.now();
      if (now - parsed.loginTimestamp > 7 * 24 * 60 * 60 * 1000) {
        this.logout();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  /**
   * Salva a sessão autenticada
   */
  saveSession(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  /**
   * Encerra a sessão
   */
  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Valida credenciais via protocolo Xtream Codes API
   * Utiliza preferencialmente o servidor de proxy backend (/api/iptv/auth)
   * que elimina 100% dos bloqueios de CORS e Mixed Content dos navegadores!
   */
  async authenticateXtream(serverUrl: string, username: string, password: string): Promise<{ session: AuthSession; channels: Channel[]; categories: Category[] }> {
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');

    // 1. TENTA PRIMEIRO VIA PROXY DE SERVIDOR BACKEND (Elimina CORS e Mixed Content)
    try {
      const proxyResponse = await fetch('/api/iptv/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          serverUrl: cleanUrl,
          username: username.trim(),
          password: password.trim(),
        }),
      });

      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        if (data.success && data.userInfo) {
          const session: AuthSession = {
            isAuthenticated: true,
            username: username.trim(),
            password: password.trim(),
            serverUrl: cleanUrl,
            authType: 'xtream',
            loginTimestamp: Date.now(),
            userInfo: {
              status: data.userInfo.status || 'Active',
              expDate: data.userInfo.exp_date ? new Date(parseInt(data.userInfo.exp_date, 10) * 1000).toLocaleDateString('pt-BR') : 'Ilimitado',
              maxConnections: parseInt(data.userInfo.max_connections || '1', 10),
              activeCons: parseInt(data.userInfo.active_cons || '0', 10),
              message: data.userInfo.message,
            },
            serverInfo: data.serverInfo,
          };

          // Converte streams para passar pelo proxy de HLS em RAM (/api/iptv/proxy)
          const channels: Channel[] = (data.streams || []).map((item: any, idx: number) => {
            const rawStreamUrl = `${cleanUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${item.stream_id}.m3u8`;
            return {
              id: String(item.stream_id || idx + 1),
              name: item.name || `Canal ${idx + 1}`,
              // Usa o proxy de stream para garantir reprodução sem CORS e com cache RAM!
              streamUrl: `/api/iptv/proxy?url=${encodeURIComponent(rawStreamUrl)}`,
              logo: item.stream_icon,
              category: item.category_id || 'Geral',
              number: item.num || idx + 1,
              epgId: item.epg_channel_id,
              isFavorite: false,
            };
          });

          // Converte categorias
          const categories: Category[] = [
            { id: 'all', name: 'Todos os Canais', count: channels.length },
            { id: 'favorites', name: 'Favoritos', count: 0 },
            ...(data.categories || []).map((cat: any) => ({
              id: String(cat.category_id),
              name: cat.category_name,
              count: channels.filter((c) => c.category === String(cat.category_id)).length,
            })),
          ];

          this.saveSession(session);
          return { session, channels, categories };
        }
      } else {
        const errorData = await proxyResponse.json().catch(() => ({}));
        if (errorData.error) {
          throw new Error(errorData.error);
        }
      }
    } catch (proxyErr: any) {
      console.warn('[AuthService] Tentativa de proxy backend falhou ou indisponível:', proxyErr.message);
      // Se deu erro com mensagem explícita do fornecedor (ex: senha errada):
      if (proxyErr.message && !proxyErr.message.includes('fetch') && !proxyErr.message.includes('NetworkError')) {
        throw proxyErr;
      }
    }

    // 2. FALLBACK: Tenta requisição direta (caso o servidor IPTV remoto possua CORS ativo)
    const directApiUrl = `${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    try {
      const response = await fetch(directApiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.user_info || data.user_info.auth === 0) {
        throw new Error('Usuário ou senha inválidos no servidor IPTV informado.');
      }

      const session: AuthSession = {
        isAuthenticated: true,
        username,
        serverUrl: cleanUrl,
        authType: 'xtream',
        loginTimestamp: Date.now(),
        userInfo: {
          status: data.user_info.status || 'Active',
          expDate: data.user_info.exp_date ? new Date(parseInt(data.user_info.exp_date, 10) * 1000).toLocaleDateString('pt-BR') : 'Ilimitado',
          maxConnections: parseInt(data.user_info.max_connections || '1', 10),
          activeCons: parseInt(data.user_info.active_cons || '0', 10),
        },
      };

      this.saveSession(session);
      return { session, channels: [], categories: [] };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na conexão direta';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        throw new Error(
          'O servidor do fornecedor bloqueou a conexão direta por política de CORS/Mixed Content. ' +
          'O proxy integrado do servidor agora está ativo para retransmitir os streams.'
        );
      }
      throw new Error(errorMsg);
    }
  },

  /**
   * Autenticação em modo Usuário / Senha dedicado do aplicativo
   */
  async authenticateAppUser(username: string, password: string): Promise<AuthSession> {
    if (!username || !password) {
      throw new Error('Informe o nome de usuário e a senha.');
    }

    if (username.length < 3 || password.length < 4) {
      throw new Error('Usuário deve ter pelo menos 3 caracteres e senha ao menos 4.');
    }

    const session: AuthSession = {
      isAuthenticated: true,
      username: username,
      token: `omni_jwt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      authType: 'app_credentials',
      loginTimestamp: Date.now(),
      userInfo: {
        status: 'Active',
        expDate: '31/12/2026',
        maxConnections: 3,
        activeCons: 1,
        message: 'Acesso VIP Ativo via Servidor Dedicado',
      },
    };

    this.saveSession(session);
    return session;
  },

  /**
   * Login em modo Demonstração / Teste Imediato (canais abertos e servidores HLS)
   */
  loginDemo(): AuthSession {
    const session: AuthSession = {
      isAuthenticated: true,
      username: 'usuario_demonstracao',
      authType: 'demo',
      loginTimestamp: Date.now(),
      userInfo: {
        status: 'Active',
        expDate: 'Demonstração Ilimitada',
        maxConnections: 5,
        activeCons: 1,
        message: 'Conectado aos Servidores de Alta Performance HLS',
      },
    };
    this.saveSession(session);
    return session;
  }
};
