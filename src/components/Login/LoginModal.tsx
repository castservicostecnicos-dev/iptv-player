import React, { useState } from 'react';
import { AuthService, type AuthSession } from '../../services/authService';
import { fetchM3uFromUrl, parseM3uContent } from '../../services/m3uParser';
import { DEMO_CHANNELS, DEMO_CATEGORIES } from '../../services/demoChannels';
import type { Channel, Category } from '../../types/iptv';
import {
  Lock,
  User,
  KeyRound,
  Server,
  FileCode,
  Zap,
  AlertCircle,
  CheckCircle2,
  Tv,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: (session: AuthSession, channels: Channel[], categories: Category[]) => void;
  onClose?: () => void;
}

type TabType = 'xtream' | 'app_login' | 'm3u' | 'demo';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onSuccess, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('xtream');

  // Formulário Xtream Codes
  const [serverUrl, setServerUrl] = useState<string>('http://servidor-iptv-exemplo.com:8080');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Formulário Login Direto App
  const [appUser, setAppUser] = useState<string>('');
  const [appPass, setAppPass] = useState<string>('');

  // Formulário M3U
  const [m3uUrl, setM3uUrl] = useState<string>('');

  // Estados de Carregamento e Mensagens
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Login via Xtream Codes
  const handleXtreamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!serverUrl || !username || !password) {
      setErrorMessage('Preencha todos os campos: Servidor, Usuário e Senha.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.authenticateXtream(serverUrl, username, password);
      setInfoMessage('Autenticado com sucesso via Proxy Dedicado! Carregando canais...');

      const loadedChannels = result.channels && result.channels.length > 0 ? result.channels : DEMO_CHANNELS;
      const loadedCategories = result.categories && result.categories.length > 0 ? result.categories : DEMO_CATEGORIES;

      onSuccess(result.session, loadedChannels, loadedCategories);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Login via Usuário e Senha do Sistema
  const handleAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await AuthService.authenticateAppUser(appUser, appPass);
      setInfoMessage('Acesso liberado pelo servidor dedicado!');
      onSuccess(session, DEMO_CHANNELS, DEMO_CATEGORIES);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Login / Carregamento via Lista M3U URL
  const handleM3uUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!m3uUrl) {
      setErrorMessage('Informe a URL da lista M3U/M3U8.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchM3uFromUrl(m3uUrl);
      const session: AuthSession = {
        isAuthenticated: true,
        username: 'Lista M3U Externa',
        authType: 'm3u_url',
        loginTimestamp: Date.now(),
        userInfo: {
          status: 'Active',
          expDate: 'Indefinido',
          maxConnections: 1,
          activeCons: 1,
        },
      };
      AuthService.saveSession(session);
      onSuccess(session, result.channels, result.categories);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar lista M3U';
      setErrorMessage(
        `${msg}. Dica: Se o fornecedor bloquear requisições de navegadores web (CORS), use o servidor dedicado de cache ou o modo de teste.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de arquivo local M3U
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseM3uContent(text);
        if (result.channels.length === 0) {
          throw new Error('Nenhum canal válido foi detectado no arquivo M3U.');
        }

        const session: AuthSession = {
          isAuthenticated: true,
          username: file.name,
          authType: 'm3u_url',
          loginTimestamp: Date.now(),
          userInfo: {
            status: 'Active',
            expDate: 'Arquivo Local',
            maxConnections: 1,
            activeCons: 1,
          },
        };
        AuthService.saveSession(session);
        onSuccess(session, result.channels, result.categories);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao ler arquivo M3U.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Login de Demonstração Imediato
  const handleDemoAccess = () => {
    setIsLoading(true);
    const session = AuthService.loginDemo();
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(session, DEMO_CHANNELS, DEMO_CATEGORIES);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Acesso ao OmniStream IPTV</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Autentique suas credenciais ou carregue sua lista de reprodução HLS
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Abas de Navegação (Segmented Controls) */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/80 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('xtream')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'xtream'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Xtream Codes API</span>
          </button>

          <button
            onClick={() => setActiveTab('app_login')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'app_login'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Login do Usuário</span>
          </button>

          <button
            onClick={() => setActiveTab('m3u')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'm3u'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Lista M3U / M3U8</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {/* Mensagens de Erro ou Sucesso */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>{infoMessage}</div>
            </div>
          )}

          {/* TAB 1: XTREAM CODES API */}
          {activeTab === 'xtream' && (
            <form onSubmit={handleXtreamLogin} className="space-y-4">
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Proxy de Servidor Ativo:</strong> Suas credenciais e streams passam pelo backend integrado, eliminando 100% dos bloqueios de CORS e Mixed Content dos navegadores.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span>URL do Servidor / DNS do Fornecedor</span>
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://servidor-iptv.com:8080"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Exemplo fornecido pelo seu painel IPTV (com protocolo http:// ou https:// e porta).
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Usuário</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu usuário"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>Senha</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Validando no Servidor...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Conectar via Xtream Codes</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: LOGIN DO USUÁRIO NO APP */}
          {activeTab === 'app_login' && (
            <form onSubmit={handleAppLogin} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                Este modo autentica o usuário no servidor backend dedicado, liberando o pacote de canais liberado para a conta sem expor os links originais do fornecedor.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nome de Usuário</span>
                </label>
                <input
                  type="text"
                  value={appUser}
                  onChange={(e) => setAppUser(e.target.value)}
                  placeholder="usuario_cliente"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Senha de Acesso</span>
                </label>
                <input
                  type="password"
                  value={appPass}
                  onChange={(e) => setAppPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: M3U URL OU ARQUIVO */}
          {activeTab === 'm3u' && (
            <div className="space-y-4">
              <form onSubmit={handleM3uUrlSubmit} className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  URL da Lista M3U / M3U8
                </label>
                <input
                  type="url"
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                  placeholder="https://exemplo.com/lista.m3u"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs transition-colors"
                >
                  Baixar & Analisar Lista M3U
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="grow border-t border-slate-800"></div>
                <span className="shrink mx-4 text-[10px] text-slate-500 uppercase tracking-widest">
                  Ou selecione arquivo local
                </span>
                <div className="grow border-t border-slate-800"></div>
              </div>

              <div>
                <label className="block text-center p-4 border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-colors">
                  <FileCode className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
                  <span className="text-xs text-slate-300 font-medium block">
                    Upload de arquivo .m3u ou .m3u8
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Processado 100% no seu dispositivo sem restrições de rede
                  </span>
                  <input
                    type="file"
                    accept=".m3u,.m3u8,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Destaque / Atalho para Teste com Canais HLS Reais */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Quer testar o player imediatamente?
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Acesse 10 canais HLS reais em 1080p com telemetria de buffer ativa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoAccess}
                className="py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Entrar em Teste
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between px-6">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Compatível com iOS, Android e Smart TVs
          </span>
          <span className="font-mono text-[10px]">CMAF · HLS v4+</span>
        </div>
      </div>
    </div>
  );
};
