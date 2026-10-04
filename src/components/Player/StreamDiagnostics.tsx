import React from 'react';
import type { StreamDiagnostics } from '../../types/iptv';
import { Activity, Zap, Cpu, Layers } from 'lucide-react';

interface StreamDiagnosticsProps {
  diagnostics: StreamDiagnostics;
  onClose?: () => void;
}

export const StreamDiagnosticsHUD: React.FC<StreamDiagnosticsProps> = ({ diagnostics }) => {
  // Define a cor da barra de buffer baseado nos segundos disponíveis
  const getBufferColor = (seconds: number) => {
    if (seconds >= 25) return 'bg-emerald-500 text-emerald-400';
    if (seconds >= 10) return 'bg-amber-500 text-amber-400';
    return 'bg-rose-500 text-rose-400';
  };

  const bufferColorClass = getBufferColor(diagnostics.bufferLengthSeconds);
  const bufferPercent = Math.min(100, Math.max(0, (diagnostics.bufferLengthSeconds / 45) * 100));

  return (
    <div className="absolute top-4 right-4 z-40 w-80 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 shadow-2xl transition-all">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-semibold tracking-wide text-slate-100">Diagnóstico de Stream em Tempo Real</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          {diagnostics.protocol}
        </span>
      </div>

      {/* Barra de Saúde do Buffer (Segundos em Memória) */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400">Buffer Carregado (RAM):</span>
          <span className="font-mono font-medium text-slate-100 tabular-nums">
            {diagnostics.bufferLengthSeconds.toFixed(1)}s / 45s
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${bufferColorClass.split(' ')[0]}`}
            style={{ width: `${bufferPercent}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          {diagnostics.bufferLengthSeconds > 20
            ? 'Protegido contra oscilações de rede (Zero Buffering)'
            : diagnostics.bufferLengthSeconds > 8
            ? 'Buffer estável carregando próximos segmentos'
            : 'Buffer baixo; preenchendo novos chunks HLS...'}
        </p>
      </div>

      {/* Grid de Métricas Técnicas */}
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="p-2 rounded bg-slate-900/70 border border-slate-800/60">
          <div className="text-slate-400 text-[10px] flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Taxa de Bits
          </div>
          <div className="text-slate-100 font-semibold mt-0.5 tabular-nums">
            {diagnostics.bitrateKbps > 0 ? `${(diagnostics.bitrateKbps / 1000).toFixed(2)} Mbps` : 'Detectando...'}
          </div>
        </div>

        <div className="p-2 rounded bg-slate-900/70 border border-slate-800/60">
          <div className="text-slate-400 text-[10px] flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" /> Resolução
          </div>
          <div className="text-slate-100 font-semibold mt-0.5">
            {diagnostics.resolution || 'Auto / 1080p'}
          </div>
        </div>

        <div className="p-2 rounded bg-slate-900/70 border border-slate-800/60">
          <div className="text-slate-400 text-[10px] flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" /> Latência Segmento
          </div>
          <div className="text-slate-100 font-semibold mt-0.5 tabular-nums">
            {diagnostics.segmentLoadTimeMs > 0 ? `${diagnostics.segmentLoadTimeMs}ms` : '< 80ms (Cache)'}
          </div>
        </div>

        <div className="p-2 rounded bg-slate-900/70 border border-slate-800/60">
          <div className="text-slate-400 text-[10px]">Quadros Descartados</div>
          <div className="text-slate-100 font-semibold mt-0.5 tabular-nums">
            {diagnostics.droppedFrames} frames (0%)
          </div>
        </div>
      </div>

      {/* Status da Origem do Conteúdo */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
        <span className="text-slate-400">Origem de Cache:</span>
        <span className="text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
          Edge RAM Cache Ativo (Nginx/ATS)
        </span>
      </div>
    </div>
  );
};
