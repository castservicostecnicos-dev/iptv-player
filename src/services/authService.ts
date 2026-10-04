export interface AuthSession {
  isAuthenticated: boolean;
  username: string;
  token?: string;
  serverUrl?: string;
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
      // Validar tempo de expiração de sessão local (ex: 7 dias)
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
   * Endpoint: {serverUrl}/player_api.php?username={username}&password={password}
   */
  async authenticateXtream(serverUrl: string, username: string, password: string): Promise<AuthSession> {
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    const apiUrl = `${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    try {
      // Tenta conexão direta (se CORS for permitido) ou via proxy
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com status HTTP ${response.status}`);
      }

      const data = await response.json();

      // Formato padrão de resposta Xtream Codes:
      // { user_info: { auth: 1, status: "Active", exp_date: "1735689600", max_connections: "2", ... }, server_info: { ... } }
      if (!data.user_info || data.user_info.auth === 0) {
        throw new Error('Usuário ou senha inválidos no servidor IPTV informado.');
      }

      if (data.user_info.status && data.user_info.status.toLowerCase() !== 'active') {
        throw new Error(`Sua conta está com status: "${data.user_info.status}". Entre em contato com seu provedor.`);
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
          message: data.user_info.message,
        },
        serverInfo: data.server_info ? {
          url: data.server_info.url || cleanUrl,
          port: data.server_info.port || '80',
          serverProtocol: data.server_info.server_protocol || 'http',
          timezone: data.server_info.timezone || 'UTC',
        } : undefined,
      };

      this.saveSession(session);
      return session;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao conectar ao servidor IPTV';
      
      // Se deu erro de CORS de navegador ao acessar servidor http remoto direto:
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        throw new Error(
          'Bloqueio de CORS do navegador ao acessar o servidor IPTV direto. ' +
          'Em servidores de produção, o tráfego deve passar pelo proxy de cache dedicado (Nginx/Edge).'
        );
      }
      throw new Error(errorMsg);
    }
  },

  /**
   * Autenticação em modo Usuário / Senha dedicado do aplicativo
   */
  async authenticateAppUser(username: string, password: string): Promise<AuthSession> {
    // Simulação com validação de credenciais locais ou demo
    if (!username || !password) {
      throw new Error('Informe o nome de usuário e a senha.');
    }

    if (username.length < 3 || password.length < 4) {
      throw new Error('Usuário deve ter pelo menos 3 caracteres e senha ao menos 4.');
    }

    // Aceita qualquer credencial de teste ou as padrão
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
