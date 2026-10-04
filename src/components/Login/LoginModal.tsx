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
  ClipboardList,
  Terminal,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: (session: AuthSession, channels: Channel[], categories: Category[]) => void;
  onClose?: () => void;
}

type TabType = 'xtream' | 'm3u' | 'app_login';
type M3uSubTab = 'paste' | 'url' | 'file';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onSuccess, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('xtream');
  const [m3uSubTab, setM3uSubTab] = useState<M3uSubTab>('paste');

  // Formulário Xtream Codes
  const [serverUrl, setServerUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Formulário M3U
  const [m3uUrl, setM3uUrl] = useState<string>('');
  const [m3uText, setM3uText] = useState<string>('');

  // Formulário App User
  const [appUser, setAppUser] = useState<string>('');
  const [appPass, setAppPass] = useState<string>('');

  // Estados de Carregamento e Mensagens
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  // Auto-detecção inteligente de credenciais quando o usuário cola link completo
  const handleServerUrlChange = (val: string) => {
    setServerUrl(val);
    const trimmed = val.trim();
    if (trimmed.includes('username=') && trimmed.includes('password=')) {
      try {
        const u = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`);
        const user = u.searchParams.get('username');
        const pass = u.searchParams.get('password');
        if (user) setUsername(user);
        if (pass) setPassword(pass);
        setInfoMessage('Usuário e senha detectados e preenchidos automaticamente da URL colada!');
      } catch {}
    }
  };

  // Login via Xtream Codes
  const handleXtreamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setDiagnosticLogs([]);

    if (!serverUrl || !username || !password) {
      setErrorMessage('Preencha os campos de Servidor, Usuário e Senha.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.authenticateXtream(serverUrl, username, password);
      setInfoMessage('Autenticado com sucesso via Proxy Dedicado! Carregando canais...');

      const loadedChannels = result.channels && result.channels.length > 0 ? result.channels : DEMO_CHANNELS;
      const loadedCategories = result.categories && result.categories.length > 0 ? result.categories : DEMO_CATEGORIES;

      onSuccess(result.session, loadedChannels, loadedCategories);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na autenticação');
      if (err.diagnosticLogs && Array.isArray(err.diagnosticLogs)) {
        setDiagnosticLogs(err.diagnosticLogs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Carregamento via Texto M3U Colado Diretamente (100% à prova de falhas de rede)
  const handlePastedM3uSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!m3uText.trim()) {
      setErrorMessage('Cole o conteúdo da sua lista M3U no campo abaixo.');
      return;
    }

    setIsLoading(true);
    try {
      const result = parseM3uContent(m3uText);
      if (result.channels.length === 0) {
        throw new Error('Nenhum canal foi encontrado no texto colado. Verifique se o texto contém URLs válidas.');
      }

      const session: AuthSession = {
        isAuthenticated: true,
        username: `Lista Colada (${result.channels.length} canais)`,
        authType: 'm3u_url',
        loginTimestamp: Date.now(),
        userInfo: {
          status: 'Active',
          expDate: 'Lista Manual',
          maxConnections: 1,
          activeCons: 1,
        },
      };

      AuthService.saveSession(session);
      setInfoMessage(`${result.channels.length} canais carregados com sucesso!`);
      onSuccess(session, result.channels, result.categories);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar lista colada.');
    } finally {
      setIsLoading(false);
    }
  };

  // Carregamento via URL M3U
  const handleM3uUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!m3uUrl.trim()) {
      setErrorMessage('Informe a URL da lista M3U.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchM3uFromUrl(m3uUrl);
      const session: AuthSession = {
        isAuthenticated: true,
        username: 'Lista M3U Remota',
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
    } catch (err: any) {
      setErrorMessage(
        `${err.message || 'Erro ao baixar lista'}. Dica: Abra o link da lista no navegador do seu celular/PC, copie o texto e use a opção "Colar Texto", que funciona 100% sem dependência de rede do servidor.`
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
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao ler arquivo M3U.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Login de Demonstração
  const handleDemoAccess = () => {
    setIsLoading(true);
    const session = AuthService.loginDemo();
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(session, DEMO_CHANNELS, DEMO_CATEGORIES);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Cabeçalho do Modal */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Acesso ao OmniStream IPTV</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Escolha o formato da sua lista para reprodução com buffer otimizado
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none p-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Abas Principais (Segmented Controls) */}
        <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setActiveTab('xtream'); setErrorMessage(null); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'xtream'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Código Xtream</span>
          </button>

          <button
            onClick={() => { setActiveTab('m3u'); setErrorMessage(null); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'm3u'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Lista M3U / M3U8</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Mensagens de Erro */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Mensagens de Sucesso */}
          {infoMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>{infoMessage}</div>
            </div>
          )}

          {/* Logs de Diagnóstico se houver falha de conexão */}
          {diagnosticLogs.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex items-center gap-1 text-cyan-400 font-semibold mb-1">
                <Terminal className="w-3.5 h-3.5" /> Diagnóstico de Conexão:
              </div>
              {diagnosticLogs.map((log, i) => (
                <div key={i} className="text-slate-300 truncate">
                  &gt; {log}
                </div>
              ))}
            </div>
          )}

          {/* ============================================================ */}
          {/* ABA 1: CÓDIGO XTREAM */}
          {/* ============================================================ */}
          {activeTab === 'xtream' && (
            <form onSubmit={handleXtreamLogin} className="space-y-3.5">
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Proxy HLS em RAM:</strong> Suas credenciais e transmissões passam pelo servidor dedicado para evitar bloqueios de CORS e manter os chunks HLS em cache.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span>URL do Servidor IPTV ou Link M3U</span>
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => handleServerUrlChange(e.target.value)}
                  placeholder="http://servidor-iptv.com:8080"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Dica: Se colar o link completo do fornecedor com ?username=..., o sistema preenche tudo automaticamente.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Usuário</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu usuário"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>Senha</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Conectando ao Fornecedor...</span>
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

          {/* ============================================================ */}
          {/* ABA 2: LISTA M3U / M3U8 (Com Opção de Colar Texto Direto) */}
          {/* ============================================================ */}
          {activeTab === 'm3u' && (
            <div className="space-y-3">
              {/* Sub-abas de M3U */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setM3uSubTab('paste')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    m3uSubTab === 'paste'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Colar Texto da Lista (Recomendado)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setM3uSubTab('url')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    m3uSubTab === 'url'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>URL da Lista</span>
                </button>

                <button
                  type="button"
                  onClick={() => setM3uSubTab('file')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    m3uSubTab === 'file'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Upload .m3u</span>
                </button>
              </div>

              {/* OPÇÃO A: COLAR TEXTO DA LISTA (100% GARANTIDO) */}
              {m3uSubTab === 'paste' && (
                <form onSubmit={handlePastedM3uSubmit} className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300 leading-relaxed">
                    💡 <strong>Método mais confiável:</strong> Abra seu link M3U no navegador ou bloco de notas, copie o texto (mesmo que sejam apenas alguns canais de teste) e cole abaixo. Não sofre bloqueios de firewall do fornecedor.
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Conteúdo da Lista M3U / M3U8
                    </label>
                    <textarea
                      value={m3uText}
                      onChange={(e) => setM3uText(e.target.value)}
                      placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;...&quot; group-title=&quot;Esportes&quot;,Canal 1 HD&#10;http://seuservidor.com:8080/live/user/pass/1.m3u8"
                      rows={6}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-cyan-500 font-mono leading-relaxed"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Carregar Canais Colados</span>
                  </button>
                </form>
              )}

              {/* OPÇÃO B: URL DA LISTA */}
              {m3uSubTab === 'url' && (
                <form onSubmit={handleM3uUrlSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Link / URL Completa da Lista M3U
                    </label>
                    <input
                      type="url"
                      value={m3uUrl}
                      onChange={(e) => setM3uUrl(e.target.value)}
                      placeholder="http://servidor.tv:8080/get.php?username=...&password=...&type=m3u_plus&output=m3u8"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {isLoading ? 'Baixando Lista...' : 'Baixar Lista Remota'}
                  </button>
                </form>
              )}

              {/* OPÇÃO C: ARQUIVO LOCAL */}
              {m3uSubTab === 'file' && (
                <div>
                  <label className="block text-center p-6 border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-colors">
                    <FileCode className="w-7 h-7 mx-auto mb-1.5 text-slate-400" />
                    <span className="text-xs text-slate-300 font-medium block">
                      Clique para selecionar seu arquivo .m3u ou .m3u8
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Processamento 100% no seu dispositivo (sem limite de tamanho)
                    </span>
                    <input
                      type="file"
                      accept=".m3u,.m3u8,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Atalho de Demonstração (Canais 100% Funcionais) */}
          <div className="pt-3 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Testar o Player Agora com Canais Legais
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Acesse 10 canais HLS verificados com EPG e telemetria de buffer em tempo real.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoAccess}
                className="py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Modo Teste
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between px-6 shrink-0">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Compatível com HLS v4+, CMAF e TS
          </span>
          <span className="font-mono text-[10px] text-emerald-400">Cache RAM Disk</span>
        </div>
      </div>
    </div>
  );
};
