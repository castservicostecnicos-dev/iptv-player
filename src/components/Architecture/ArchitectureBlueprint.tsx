import React, { useState } from 'react';
import { CacheSimulator } from './CacheSimulator';
import { ConfigExportModal } from './ConfigExportModal';
import {
  Server,
  Zap,
  ShieldCheck,
  Smartphone,
  Cpu,
  Globe,
  Lock,
  Layers,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Network,
  ArrowRight,
} from 'lucide-react';

export const ArchitectureBlueprint: React.FC = () => {
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [activeTopic, setActiveTopic] = useState<'overview' | 'cache_strategy' | 'hardware' | 'player_ios_android'>('overview');

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Banner Principal com Chamada de Ação Técnica */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap className="w-3.5 h-3.5" /> Arquitetura de Alto Desempenho
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight leading-tight">
            Engenharia de Streaming IPTV sem Travamentos com Servidor de Cache Dedicado
          </h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Guia completo de engenharia para implementar um player universal (Android, iOS e Web) integrado a servidores de cache em memória RAM. Elimine o buffering, proteja a conta do fornecedor contra sobrecarga e entregue transmissões HLS com latência ultrabaixa.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <FileCode className="w-4 h-4" />
              <span>Ver Arquivos Nginx, Docker & Sysctl Prontos</span>
            </button>
          </div>
        </div>

        {/* Efeito sutil de iluminação de fundo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Menu de Navegação das Seções de Engenharia */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTopic('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTopic === 'overview'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>1. Visão Geral & Topologia</span>
        </button>

        <button
          onClick={() => setActiveTopic('cache_strategy')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTopic === 'cache_strategy'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Estratégia de Cache em RAM Disk</span>
        </button>

        <button
          onClick={() => setActiveTopic('player_ios_android')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTopic === 'player_ios_android'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>3. Player Nativo Android & iOS</span>
        </button>

        <button
          onClick={() => setActiveTopic('hardware')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTopic === 'hardware'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>4. Dimensionamento & Custos de Servidor</span>
        </button>
      </div>

      {/* SEÇÃO 1: VISÃO GERAL & TOPOLOGIA DE REDE */}
      {activeTopic === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">Login & Senha Blindados</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autentica via Xtream Codes API sem expor a URL original do fornecedor nem as credenciais mestras aos dispositivos finais.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">Cache de Segmentos RAM</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pedaços de vídeo (.ts / .m4s) são salvos em RAM disk (/dev/shm). 1 stream upstream atende 5.000 clientes instantaneamente.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">Anti-Throttling ISP</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Entrega criptografada em TLS 1.3 / HTTPS com TCP BBR evita que provedores residenciais estrangulem a velocidade de vídeo.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Smartphone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">Multiplataforma HLS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Motor duplo: iOS roda aceleração nativa AVPlayer e Android/Web roda Hls.js com buffer profundo de até 45 segundos.
              </p>
            </div>
          </div>

          {/* Diagrama Visual da Topologia */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-base font-bold text-slate-100 mb-1">Topologia de Rede: Fluxo de Dados Otimizado</h3>
            <p className="text-xs text-slate-400 mb-6">
              Como o servidor intermediário dedicado isola o fornecedor e entrega os pacotes a milhares de usuários
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Passo 1: Fornecedor */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 relative">
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Origem</div>
                <h4 className="text-sm font-bold text-slate-200">Servidor do Fornecedor IPTV</h4>
                <p className="text-xs text-slate-400 mt-1">Painel Xtream Codes ou link M3U.</p>
                <div className="mt-3 p-2.5 rounded bg-slate-900 text-[11px] font-mono text-slate-300">
                  <span className="text-rose-400">Limite:</span> 1 a 2 conexões por conta
                </div>
              </div>

              {/* Passo 2: Servidor Dedicado Edge Cache */}
              <div className="p-5 rounded-xl bg-cyan-950/30 border border-cyan-500/50 shadow-lg shadow-cyan-500/10 relative">
                <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest mb-1">Seu Servidor Dedicado</div>
                <h4 className="text-sm font-bold text-cyan-100">Edge Cache Nginx + RAM Disk</h4>
                <p className="text-xs text-slate-300 mt-1">Localizado em data center com porta 10 Gbps (ex: Hetzner ou OVH).</p>
                <div className="mt-3 space-y-1.5 text-[11px] font-mono">
                  <div className="text-emerald-400">✓ /dev/shm (RAM tmpfs 16GB)</div>
                  <div className="text-emerald-400">✓ proxy_cache_lock (1 fetch único)</div>
                  <div className="text-emerald-400">✓ SSL / CORS / TCP BBR</div>
                </div>
              </div>

              {/* Passo 3: Usuários Finais */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 relative">
                <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1">Destino</div>
                <h4 className="text-sm font-bold text-slate-200">Usuários Android, iOS & Web</h4>
                <p className="text-xs text-slate-400 mt-1">Dispositivos móveis, Smart TVs e navegadores.</p>
                <div className="mt-3 p-2.5 rounded bg-slate-900 text-[11px] font-mono text-slate-300">
                  <span className="text-emerald-400">Resultado:</span> 0ms latência local, buffer de 45s cheio
                </div>
              </div>
            </div>
          </div>

          {/* O Simulador Interativo */}
          <CacheSimulator />
        </div>
      )}

      {/* SEÇÃO 2: ESTRATÉGIA DE CACHE EM RAM DISK */}
      {activeTopic === 'cache_strategy' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              O Segredo do HLS: Por que o Cache em RAM Elimina o Travamento
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O protocolo HLS (HTTP Live Streaming) não é uma conexão contínua como antigamente (RTMP). Ele divide a transmissão de TV em pequenos pedaços de arquivo chamados <strong>segmentos (.ts ou .m4s)</strong>, tipicamente de 2 a 6 segundos cada, acompanhados de uma lista de reprodução dinâmica chamada <strong>manifest (.m3u8)</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-2">
                  <FileCode className="w-4 h-4" />
                  <span>1. Regra para Manifests (.m3u8)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O arquivo .m3u8 avisa ao player quais são os próximos segmentos disponíveis. Ele muda a cada 2 segundos.
                  Por isso, deve ter um <strong>TTL de cache curtíssimo (1 a 2 segundos)</strong> para manter o usuário sempre colado na transmissão ao vivo sem atraso (delay).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-2">
                  <Layers className="w-4 h-4" />
                  <span>2. Regra para Segmentos de Vídeo (.ts / .m4s)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Os pedaços de vídeo são <strong>100% imutáveis</strong>. Uma vez gerado o <code className="text-emerald-300">segment_5021.ts</code>, o seu conteúdo nunca mais muda. Ele deve ser armazenado na <strong>memória RAM (/dev/shm)</strong> por 120 segundos. Se 10.000 pessoas assistem ao jogo, todos recebem esse pedaço da RAM do seu servidor sem tocar no fornecedor.
                </p>
              </div>
            </div>

            {/* Proteção contra Thundering Herd */}
            <div className="mt-4 p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>O Efeito &quot;Thundering Herd&quot; (Manada Trovejante) & Como Evitá-lo</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Durante o gol de uma partida, o manifest adiciona um novo segmento ao vivo. Milhares de players conectados solicitam esse novo chunk no exato mesmo milissegundo. Sem uma diretiva de trava, seu servidor faria 1.000 requisições simultâneas ao fornecedor, derrubando a conta. No Nginx, ativamos:
              </p>
              <pre className="mt-2 p-2.5 rounded bg-black/60 font-mono text-[11px] text-amber-200">
{`proxy_cache_lock on;
proxy_cache_lock_timeout 5s;
proxy_cache_use_stale updating error timeout;`}
              </pre>
              <p className="mt-2 text-slate-400">
                Isso faz com que apenas <strong>1 requisição</strong> vá até o fornecedor. Os outros 999 clientes aguardam em fila por alguns milissegundos e recebem o segmento assim que o primeiro chunk cair na memória RAM.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 3: PLAYER NATIVO ANDROID & IOS */}
      {activeTopic === 'player_ios_android' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              Engenharia de Reprodução HLS no Android e iOS
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dispositivos móveis têm motores de renderização de vídeo completamente diferentes. Um player de alta qualidade precisa alternar transparentemente de tecnologia conforme a plataforma:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* iOS */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Apple iOS (iPhone / iPad)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300">
                    AVPlayer Nativo
                  </span>
                </div>
                <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                  <p>
                    • No iOS, a Apple <strong>não permite Media Source Extensions (MSE)</strong> para transmissões HLS no Safari/WebViews.
                  </p>
                  <p>
                    • O player deve detectar o dispositivo e atribuir o link .m3u8 diretamente ao atributo <code className="text-cyan-300 font-mono">video.src</code>.
                  </p>
                  <p>
                    • Ganha suporte instantâneo a <strong>Picture-in-Picture (PiP) nativo</strong>, AirPlay para Apple TV e aceleração de hardware por chip Bionic/M-Series sem consumo excessivo de bateria.
                  </p>
                </div>
              </div>

              {/* Android */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    Android (Chrome, Samsung Internet, WebViews)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300">
                    Hls.js com Web Workers
                  </span>
                </div>
                <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                  <p>
                    • Utiliza o motor <strong>Hls.js</strong> aproveitando Media Source Extensions (MSE).
                  </p>
                  <p>
                    • <strong>Web Worker Demuxing:</strong> O processamento dos pacotes MPEG-TS é feito em thread secundária, impedindo que a interface do usuário trave (60 FPS fluidos).
                  </p>
                  <p>
                    • <strong>Buffer Profundo:</strong> Configuramos o buffer para até 45 segundos, permitindo que o usuário assista sem interrupções mesmo se passar por um túnel ou oscilação do 4G/5G.
                  </p>
                </div>
              </div>
            </div>

            {/* Requisitos de CORS e HTTPS */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Por que você PRECISA do servidor intermediário para rodar no Android e iOS?
              </h4>
              <p className="text-slate-400 leading-relaxed mt-1">
                99% dos fornecedores de IPTV enviam transmissões através de conexões não seguras <code className="text-rose-400 font-mono">http://</code> e sem os cabeçalhos <code className="text-cyan-300 font-mono">Access-Control-Allow-Origin: *</code> (CORS). Navegadores modernos em smartphones bloqueiam automaticamente essas conexões por segurança (erro de Mixed Content). O seu servidor dedicado com Nginx adiciona SSL (HTTPS) gratuito e os cabeçalhos de CORS exigidos, permitindo a reprodução em qualquer aparelho sem nenhuma barreira.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: DIMENSIONAMENTO & CUSTOS DE SERVIDOR */}
      {activeTopic === 'hardware' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Dimensionamento de Servidores Dedicados & Custos Estimados
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Recomendações técnicas de hardware e portas de rede para diferentes volumes de clientes simultâneos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nível 1: Inicial */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                    Plano Pequeno
                  </span>
                  <h4 className="text-base font-bold text-slate-200">Até 300 Simultâneos</h4>
                  <div className="mt-3 space-y-2 text-xs text-slate-300 font-mono">
                    <div>CPU: 4 a 8 Núcleos (ex: Ryzen 5 / Intel Xeon)</div>
                    <div>RAM: 16 GB a 32 GB DDR4</div>
                    <div>Link: 1 Gbps Dedicado Não Tarifado</div>
                    <div>Armazenamento: 250 GB NVMe</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Custo Médio Mensal</div>
                  <div className="text-lg font-bold text-slate-100 font-mono">€35 - €50 /mês</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Hetzner Server Auction / OVH Eco</div>
                </div>
              </div>

              {/* Nível 2: Médio Porte */}
              <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 flex flex-col justify-between relative shadow-lg shadow-cyan-500/10">
                <div>
                  <div className="inline-block px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase mb-2">
                    Mais Recomendado
                  </div>
                  <h4 className="text-base font-bold text-cyan-100">Até 1.500 Simultâneos</h4>
                  <div className="mt-3 space-y-2 text-xs text-slate-300 font-mono">
                    <div>CPU: 8 a 16 Núcleos (AMD EPYC ou Xeon Gold)</div>
                    <div>RAM: 64 GB DDR4 (16GB alocada para /dev/shm)</div>
                    <div>Link: 10 Gbps (Burst garantido)</div>
                    <div>Armazenamento: 500 GB NVMe Gen4</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-cyan-800/40">
                  <div className="text-[10px] text-slate-400 uppercase">Custo Médio Mensal</div>
                  <div className="text-lg font-bold text-cyan-300 font-mono">€80 - €140 /mês</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Hetzner EX-Line / Leaseweb / OVH Rise</div>
                </div>
              </div>

              {/* Nível 3: Grande Escala */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block mb-1">
                    Alta Escala
                  </span>
                  <h4 className="text-base font-bold text-slate-200">5.000+ Simultâneos</h4>
                  <div className="mt-3 space-y-2 text-xs text-slate-300 font-mono">
                    <div>CPU: Cluster Load Balancer (2+ Nós)</div>
                    <div>RAM: 128 GB+ por nó</div>
                    <div>Link: 20 Gbps a 40 Gbps agregados</div>
                    <div>GeoDNS / Anycast CDN</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Custo Médio Mensal</div>
                  <div className="text-lg font-bold text-slate-100 font-mono">€250 - €450 /mês</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Cluster Dedicado Multi-Data Center</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal com Arquivos de Configuração Prontos */}
      <ConfigExportModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};
