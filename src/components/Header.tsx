import React from 'react';
import type { AuthSession } from '../services/authService';
import { User, LogOut, FileCode } from 'lucide-react';

interface HeaderProps {
  currentView: 'player' | 'architecture' | 'simulator';
  onNavigate: (view: 'player' | 'architecture' | 'simulator') => void;
  session: AuthSession | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenConfigModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  session,
  onOpenLogin,
  onLogout,
  onOpenConfigModal,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onNavigate('player')}
        className="text-lg font-bold tracking-tight text-slate-100 hover:text-cyan-400 transition-colors cursor-pointer"
      >
        OmniStream IPTV
      </button>

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onNavigate('player')}
          className={`hover:text-slate-100 transition-colors pb-0.5 cursor-pointer ${
            currentView === 'player' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
          }`}
        >
          Player Ao Vivo
        </button>
        <button
          onClick={() => onNavigate('architecture')}
          className={`hover:text-slate-100 transition-colors pb-0.5 cursor-pointer ${
            currentView === 'architecture' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
          }`}
        >
          Arquitetura de Cache
        </button>
        <button
          onClick={() => onNavigate('simulator')}
          className={`hover:text-slate-100 transition-colors pb-0.5 cursor-pointer ${
            currentView === 'simulator' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
          }`}
        >
          Simulador de Banda
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenConfigModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
          <span>Configurações Nginx</span>
        </button>

        {session && session.isAuthenticated ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
              title="Informações da Conta"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[120px]">{session.username}</span>
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors whitespace-nowrap cursor-pointer shadow-md shadow-cyan-500/20"
          >
            Entrar / Autenticar
          </button>
        )}
      </div>
    </header>
  );
};
