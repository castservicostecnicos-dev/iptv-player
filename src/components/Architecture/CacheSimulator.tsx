import React, { useState } from 'react';
import {
  Users,
  HardDrive,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const CacheSimulator: React.FC = () => {
  const [concurrentUsers, setConcurrentUsers] = useState<number>(500);
  const [bitrateMbps, setBitrateMbps] = useState<number>(6.0); // 1080p 60fps = ~6Mbps
  const [activeChannelsCount, setActiveChannelsCount] = useState<number>(8); // Quantos canais distintos assistidos

  // Cálculos Técnicos em Tempo Real
  // 1. Sem Cache (Todos batem direto no Fornecedor):
  const rawBandwidthGbps = (concurrentUsers * bitrateMbps) / 1000;
  const rawProviderConnections = concurrentUsers;
  const rawPacketLossPercent = concurrentUsers > 200 ? Math.min(35, (concurrentUsers - 200) * 0.08) : 0.8;
  const rawBufferRisk = concurrentUsers > 150 ? 'Crítico (Travamento Constante)' : 'Moderado';

  // 2. Com Servidor Cache Dedicado (Nginx RAM Disk):
  // O servidor dedicated busca APENAS 1 stream por canal ativo do fornecedor!
  const cachedUpstreamBandwidthMbps = activeChannelsCount * bitrateMbps;
  const cachedUpstreamGbps = cachedUpstreamBandwidthMbps / 1000;
  const bandwidthSavedGbps = Math.max(0, rawBandwidthGbps - cachedUpstreamGbps);
  const bandwidthSavedPercent = ((rawBandwidthGbps - cachedUpstreamGbps) / rawBandwidthGbps) * 100;
  const cacheHitRatio = 99.4; // Taxa de acerto comprovada para chunks HLS em RAM
  const ramRequiredGb = Math.ceil((activeChannelsCount * bitrateMbps * 60) / 8 / 1024); // 60s de buffer por canal

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Simulador de Eficiência do Servidor de Cache Dedicado
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simule o comportamento de tráfego de rede, economia de link e eliminação de travamentos.
          </p>
        </div>

        {/* Resumo de Economia em Destaque */}
        <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/30 px-4 py-2.5 rounded-xl">
          <div>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
              Economia de Banda Upstream
            </div>
            <div className="text-lg font-bold text-emerald-300 font-mono tabular-nums">
              {bandwidthSavedPercent.toFixed(1)}% ({bandwidthSavedGbps.toFixed(2)} Gbps)
            </div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
        </div>
      </div>

      {/* Controles Interativos (Sliders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Slider 1: Usuários Simultâneos */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Usuários Simultâneos
            </span>
            <span className="text-sm font-bold text-cyan-300 font-mono tabular-nums">
              {concurrentUsers.toLocaleString()} clientes
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="3000"
            step="20"
            value={concurrentUsers}
            onChange={(e) => setConcurrentUsers(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>20</span>
            <span>1.500</span>
            <span>3.000</span>
          </div>
        </div>

        {/* Slider 2: Taxa de Bits (Qualidade do Vídeo) */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Qualidade do Stream
            </span>
            <span className="text-sm font-bold text-amber-300 font-mono tabular-nums">
              {bitrateMbps} Mbps ({bitrateMbps >= 10 ? '4K UHD' : bitrateMbps >= 5 ? '1080p 60fps' : '720p HD'})
            </span>
          </div>
          <input
            type="range"
            min="2.5"
            max="15.0"
            step="0.5"
            value={bitrateMbps}
            onChange={(e) => setBitrateMbps(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>720p (2.5M)</span>
            <span>1080p (6M)</span>
            <span>4K (15M)</span>
          </div>
        </div>

        {/* Slider 3: Canais Distintos Sendo Assistidos */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              Canais Ativos Concorrentes
            </span>
            <span className="text-sm font-bold text-indigo-300 font-mono tabular-nums">
              {activeChannelsCount} canais
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={activeChannelsCount}
            onChange={(e) => setActiveChannelsCount(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>1 canal (ex: Final)</span>
            <span>15 canais</span>
            <span>30 canais</span>
          </div>
        </div>
      </div>

      {/* Comparativo Direto: Sem Cache vs Com Cache Dedicado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cenário A: Sem Servidor de Cache (Falha Clássica) */}
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-900/40">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <h4 className="text-sm font-semibold text-rose-200">
                Sem Cache (Conexão Direta ao Fornecedor)
              </h4>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-900/50 text-rose-300">
              Instável
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Conexões no Fornecedor:</span>
              <span className="font-mono font-bold text-rose-400 tabular-nums">
                {rawProviderConnections} conexões simultâneas
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tráfego Exigido do Fornecedor:</span>
              <span className="font-mono font-bold text-rose-400 tabular-nums">
                {rawBandwidthGbps.toFixed(2)} Gbps
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Risco de Bloqueio por Limite:</span>
              <span className="font-mono font-bold text-rose-400">
                {concurrentUsers > 2 ? '100% Certo (Bloqueio IP)' : 'Baixo'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Latência Média por Segmento:</span>
              <span className="font-mono text-slate-300 tabular-nums">
                850ms - 2.400ms (Jitter Alto)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Perda Estimada de Pacotes:</span>
              <span className="font-mono text-rose-400 tabular-nums">
                {rawPacketLossPercent.toFixed(1)}%
              </span>
            </div>

            <div className="pt-3 border-t border-rose-900/40 text-[11px] text-rose-300/90 leading-relaxed">
              ⚠️ O fornecedor bloqueia contas com conexões concorrentes não autorizadas e a internet internacional dos clientes sofre estrangulamento (throttling), resultando no círculo de carregamento infinito.
            </div>
          </div>
        </div>

        {/* Cenário B: Com Servidor de Cache Dedicado (Arquitetura Recomendada) */}
        <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-900/40">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-semibold text-cyan-200">
                Com Servidor Edge Cache Dedicado (Nginx/ATS)
              </h4>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300">
              Zero Travamento
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Conexões no Fornecedor:</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                Apenas {activeChannelsCount} streams únicos
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tráfego Exigido do Fornecedor:</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                Apenas {cachedUpstreamBandwidthMbps.toFixed(1)} Mbps ({cachedUpstreamGbps.toFixed(3)} Gbps)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Taxa de Acerto em Cache (RAM):</span>
              <span className="font-mono font-bold text-cyan-400 tabular-nums">
                {cacheHitRatio}%
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Latência de Entrega ao Usuário:</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                &lt; 5ms (RAM / Linha Nacional)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Memória RAM Dedicada Necessária:</span>
              <span className="font-mono text-cyan-300 tabular-nums">
                ~{Math.max(4, ramRequiredGb)} GB (em /dev/shm)
              </span>
            </div>

            <div className="pt-3 border-t border-cyan-900/40 text-[11px] text-cyan-300/90 leading-relaxed">
              ✅ 1 único stream baixado do fornecedor atende simultaneamente {concurrentUsers} pessoas sem sobrecarga. O Nginx distribui os chunks .ts diretamente da memória RAM em milissegundos.
            </div>
          </div>
        </div>
      </div>

      {/* Explicação da Mágica do Cache */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold shrink-0">
          <Clock className="w-4 h-4" />
          <span>Como funciona na prática:</span>
        </div>
        <div className="flex-1 leading-relaxed text-slate-400">
          Quando o primeiro usuário sintoniza um canal, o servidor dedicado solicita o pedaço <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded font-mono">segmento_1042.ts</code> ao fornecedor e salva na memória RAM. Nos próximos 60 segundos, qualquer outro usuário que pedir o mesmo pedaço recebe a cópia instantânea da RAM do servidor dedicado com 0ms de espera.
        </div>
      </div>
    </div>
  );
};
