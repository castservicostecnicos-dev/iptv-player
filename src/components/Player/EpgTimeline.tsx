import React from 'react';
import type { Channel, EpgItem } from '../../types/iptv';
import { getChannelEpgSchedule } from '../../services/demoChannels';
import { Calendar, Clock, Info } from 'lucide-react';

interface EpgTimelineProps {
  channel: Channel | null;
}

export const EpgTimeline: React.FC<EpgTimelineProps> = ({ channel }) => {
  if (!channel) return null;

  const schedule: EpgItem[] = getChannelEpgSchedule(channel.id);
  const currentProgram = schedule[0];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Calcula porcentagem decorrida do programa atual
  const now = new Date().getTime();
  const startTime = currentProgram.start.getTime();
  const endTime = currentProgram.end.getTime();
  const elapsed = Math.max(0, Math.min(100, ((now - startTime) / (endTime - startTime)) * 100));

  return (
    <div className="bg-slate-900/90 border-t border-slate-800 p-4 text-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100">Guia de Programação (EPG)</span>
        </div>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          {formatTime(new Date())} (Horário de Brasília)
        </span>
      </div>

      {/* Programa Atual em Destaque */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-medium text-cyan-400 uppercase tracking-wide">No Ar Agora</span>
          <span className="font-mono text-slate-400 tabular-nums">
            {formatTime(currentProgram.start)} - {formatTime(currentProgram.end)}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-slate-100 mb-1">
          {channel.currentProgram || currentProgram.title}
        </h4>
        <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
          {currentProgram.description}
        </p>

        {/* Barra de Progresso do Programa */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${elapsed}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-slate-400 tabular-nums">
            {Math.round(elapsed)}%
          </span>
        </div>
      </div>

      {/* Próximos Programas da Grade */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          A Seguir
        </span>
        {schedule.slice(1).map((prog) => (
          <div
            key={prog.id}
            className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/40 text-slate-300"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                {formatTime(prog.start)}
              </span>
              <span className="truncate text-xs text-slate-200">{prog.title}</span>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0">
              {Math.round((prog.end.getTime() - prog.start.getTime()) / (1000 * 60))} min
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Sincronização EPG via XMLTV / Xtream Codes API ativa. Atualizado a cada 12 horas.</span>
      </div>
    </div>
  );
};
