import React, { useState, useEffect } from 'react';
import type { Channel, Category } from './types/iptv';
import { AuthService, type AuthSession } from './services/authService';
import { DEMO_CHANNELS, DEMO_CATEGORIES } from './services/demoChannels';
import { Header } from './components/Header';
import { VideoPlayer } from './components/Player/VideoPlayer';
import { ChannelList } from './components/Player/ChannelList';
import { EpgTimeline } from './components/Player/EpgTimeline';
import { LoginModal } from './components/Login/LoginModal';
import { ArchitectureBlueprint } from './components/Architecture/ArchitectureBlueprint';
import { CacheSimulator } from './components/Architecture/CacheSimulator';
import { ConfigExportModal } from './components/Architecture/ConfigExportModal';
import {
  Tv,
  Layers,
  Activity,
  Menu,
  X,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export default function App() {
  // Estado da Sessão de Autenticação
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Canais e Categorias
  const [channels, setChannels] = useState<Channel[]>(DEMO_CHANNELS);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(DEMO_CHANNELS[0]);

  // Visualização Ativa
  const [currentView, setCurrentView] = useState<'player' | 'architecture' | 'simulator'>('player');

  // Controle de Interface Mobile
  const [mobileChannelDrawer, setMobileChannelDrawer] = useState<boolean>(false);
  const [showEpgBottom, setShowEpgBottom] = useState<boolean>(true);

  // Carrega sessão salva no localStorage ao iniciar
  useEffect(() => {
    const saved = AuthService.getSession();
    if (saved) {
      setSession(saved);
    } else {
      // Cria sessão de demonstração inicial para que o usuário possa testar de imediato
      const demo = AuthService.loginDemo();
      setSession(demo);
    }
  }, []);

  // Alternar Favorito
  const handleToggleFavorite = (channelId: string) => {
    setChannels((prev) => {
      const updated = prev.map((ch) =>
        ch.id === channelId ? { ...ch, isFavorite: !ch.isFavorite } : ch
      );
      // Atualiza contagem de favoritos
      const favCount = updated.filter((c) => c.isFavorite).length;
      setCategories((catPrev) =>
        catPrev.map((cat) => (cat.id === 'favorites' ? { ...cat, count: favCount } : cat))
      );
      return updated;
    });
  };

  // Próximo Canal
  const handleNextChannel = () => {
    if (!selectedChannel) return;
    const currentIndex = channels.findIndex((c) => c.id === selectedChannel.id);
    const nextIndex = (currentIndex + 1) % channels.length;
    setSelectedChannel(channels[nextIndex]);
  };

  // Canal Anterior
  const handlePrevChannel = () => {
    if (!selectedChannel) return;
    const currentIndex = channels.findIndex((c) => c.id === selectedChannel.id);
    const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
    setSelectedChannel(channels[prevIndex]);
  };

  // Sucesso de Login
  const handleLoginSuccess = (
    newSession: AuthSession,
    newChannels: Channel[],
    newCategories: Category[]
  ) => {
    setSession(newSession);
    setChannels(newChannels);
    setCategories(newCategories);
    if (newChannels.length > 0) {
      setSelectedChannel(newChannels[0]);
    }
    setIsLoginModalOpen(false);
  };

  // Logout
  const handleLogout = () => {
    AuthService.logout();
    setSession(null);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Barra de Navegação Superior (Top Bar Contract) */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        session={session}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
      />

      {/* Visão 1: PLAYER AO VIVO & GRADE DE CANAIS */}
      {currentView === 'player' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Drawer Lateral no Desktop (Lista de Canais) */}
          <div className="hidden md:flex w-80 lg:w-96 flex-col shrink-0 border-r border-slate-800 bg-slate-950 h-[calc(100vh-65px)]">
            <ChannelList
              channels={channels}
              categories={categories}
              selectedChannel={selectedChannel}
              onSelectChannel={(ch) => setSelectedChannel(ch)}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>

          {/* Área Principal de Reprodução de Vídeo + EPG */}
          <div className="flex-1 flex flex-col overflow-y-auto h-[calc(100vh-65px)]">
            {/* Player de Vídeo HLS / iOS Nativo */}
            <div className="w-full aspect-video max-h-[65vh] bg-black shrink-0 relative">
              <VideoPlayer
                channel={selectedChannel}
                onNextChannel={handleNextChannel}
                onPrevChannel={handlePrevChannel}
              />
            </div>

            {/* Barra de Controle de Contexto Mobile */}
            <div className="md:hidden flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
              <button
                onClick={() => setMobileChannelDrawer(!mobileChannelDrawer)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold"
              >
                {mobileChannelDrawer ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span>{mobileChannelDrawer ? 'Fechar Canais' : 'Grade de Canais'}</span>
              </button>

              <button
                onClick={() => setShowEpgBottom(!showEpgBottom)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>EPG</span>
              </button>
            </div>

            {/* Drawer de Canais Flutuante no Mobile */}
            {mobileChannelDrawer && (
              <div className="md:hidden flex-1 min-h-[380px] bg-slate-950 border-b border-slate-800">
                <ChannelList
                  channels={channels}
                  categories={categories}
                  selectedChannel={selectedChannel}
                  onSelectChannel={(ch) => {
                    setSelectedChannel(ch);
                    setMobileChannelDrawer(false);
                  }}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            )}

            {/* Informações Rápidas e Guia EPG */}
            <div className="flex-1 bg-slate-950 p-4 md:p-6 space-y-6">
              {/* Card de Resumo do Canal Selecionado */}
              {selectedChannel && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {selectedChannel.logo ? (
                        <img
                          src={selectedChannel.logo}
                          alt={selectedChannel.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Tv className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-400 font-semibold">
                          CH #{selectedChannel.number || 1}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">
                          {selectedChannel.category}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-100 mt-0.5">
                        {selectedChannel.name}
                      </h2>
                    </div>
                  </div>

                  {/* Indicadores de Proteção de Rede */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edge Cache RAM Ativo</span>
                    </div>

                    <button
                      onClick={() => setIsConfigModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                    >
                      Configurar Servidor
                    </button>
                  </div>
                </div>
              )}

              {/* Guia de Programação (EPG) */}
              {showEpgBottom && <EpgTimeline channel={selectedChannel} />}
            </div>
          </div>
        </div>
      )}

      {/* Visão 2: ARQUITETURA DE CACHE & ENGENHARIA DE SERVIDOR */}
      {currentView === 'architecture' && (
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <ArchitectureBlueprint />
        </div>
      )}

      {/* Visão 3: SIMULADOR DE BANDA & BENCHMARK */}
      {currentView === 'simulator' && (
        <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-400" />
              Simulador de Tráfego e Economia de Servidor Dedicado
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Avalie como a técnica de HLS chunk caching em RAM elimina o estrangulamento de banda e previne quedas em dias de pico.
            </p>
          </div>
          <CacheSimulator />
        </div>
      )}

      {/* Modal de Autenticação / Login */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onSuccess={handleLoginSuccess}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Modal de Exportação de Configurações do Servidor */}
      <ConfigExportModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
}
