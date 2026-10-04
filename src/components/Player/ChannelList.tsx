import React, { useState, useMemo } from 'react';
import type { Channel, Category } from '../../types/iptv';
import { Search, Star, Tv, Radio, Play } from 'lucide-react';

interface ChannelListProps {
  channels: Channel[];
  categories: Category[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  categories,
  selectedChannel,
  onSelectChannel,
  onToggleFavorite,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Filtragem rápida e responsiva
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      const matchesSearch =
        ch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ch.number && String(ch.number).includes(searchTerm));

      if (!matchesSearch) return false;

      if (activeCategory === 'all') return true;
      if (activeCategory === 'favorites') return !!ch.isFavorite;

      return (
        ch.category.toLowerCase() === activeCategory.toLowerCase() ||
        ch.category.toLowerCase().replace(/\s+/g, '-') === activeCategory.toLowerCase()
      );
    });
  }, [channels, searchTerm, activeCategory]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80">
      {/* Barra de Busca Superior */}
      <div className="p-3 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar canais ou número..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Categorias (Segmented control) */}
      <div className="px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {cat.id === 'favorites' && <Star className="w-3 h-3 fill-current text-amber-400" />}
              <span>{cat.name}</span>
              {cat.count > 0 && (
                <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista de Canais com Scroll Fluido */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900/80 p-1">
        {filteredChannels.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Radio className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            <p>Nenhum canal encontrado para &quot;{searchTerm || activeCategory}&quot;</p>
          </div>
        ) : (
          filteredChannels.map((channel, idx) => {
            const isSelected = selectedChannel?.id === channel.id;

            return (
              <div
                key={channel.id || idx}
                onClick={() => onSelectChannel(channel)}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border border-cyan-500/30 text-white shadow-xs'
                    : 'hover:bg-slate-900/80 text-slate-300 border border-transparent'
                }`}
              >
                {/* Número do Canal */}
                <span className="font-mono text-[11px] text-slate-500 w-6 text-right shrink-0 tabular-nums">
                  {channel.number || idx + 1}
                </span>

                {/* Ícone ou Logo do Canal */}
                <div className="w-9 h-9 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback se imagem quebrar
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Tv className="w-4 h-4 text-slate-600" />
                  )}

                  {isSelected && (
                    <div className="absolute inset-0 bg-cyan-600/30 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-cyan-300 fill-current" />
                    </div>
                  )}
                </div>

                {/* Informações de Título e Programa Atual */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-cyan-200' : 'text-slate-200'
                      }`}
                    >
                      {channel.name}
                    </h4>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {channel.currentProgram || channel.category || 'Transmissão Ao Vivo'}
                  </p>
                </div>

                {/* Botão de Favoritar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(channel.id);
                  }}
                  className="p-1 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                  title={channel.isFavorite ? 'Remover dos favoritos' : 'Favoritar canal'}
                >
                  <Star
                    className={`w-4 h-4 ${
                      channel.isFavorite ? 'text-amber-400 fill-current' : 'text-slate-600'
                    }`}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé com Contador de Canais Disponíveis */}
      <div className="p-2.5 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between bg-slate-950">
        <span>Canais Carregados</span>
        <span className="font-mono text-slate-300 tabular-nums">
          {filteredChannels.length} de {channels.length}
        </span>
      </div>
    </div>
  );
};
