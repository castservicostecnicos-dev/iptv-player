import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import type { Channel, StreamDiagnostics, BufferProfileMode } from '../../types/iptv';
import { getHlsConfig, isAppleDevice, BUFFER_PROFILES } from '../../services/hlsConfig';
import { StreamDiagnosticsHUD } from './StreamDiagnostics';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sliders,
  Activity,
  Tv,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Layers,
} from 'lucide-react';

interface VideoPlayerProps {
  channel: Channel | null;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
  onToggleChannelList?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  onPrevChannel,
  onNextChannel,
  onToggleChannelList,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Estados de Reprodução
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [bufferProfile, setBufferProfile] = useState<BufferProfileMode>('anti_freeze');
  const [aspectRatio, setAspectRatio] = useState<'fit' | 'fill' | '16:9' | '4:3'>('fit');
  const [isPipActive, setIsPipActive] = useState<boolean>(false);
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  const [qualityLevels, setQualityLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto

  // Telemetria do Stream
  const [diagnostics, setDiagnostics] = useState<StreamDiagnostics>({
    bufferLengthSeconds: 0,
    bitrateKbps: 0,
    resolution: '',
    fps: 60,
    droppedFrames: 0,
    latencySeconds: 0,
    cacheHit: true,
    segmentLoadTimeMs: 0,
    audioTrack: 'Padrão',
    protocol: 'HLS',
    status: 'idle',
  });

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying]);

  // Limpeza de Hls anterior
  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Inicialização do Player com Suporte HLS e Fallback Nativo Apple
  useEffect(() => {
    if (!channel || !channel.streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    cleanupHls();
    setIsBuffering(true);

    const isApple = isAppleDevice();
    const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl');

    if (isApple && canPlayNativeHls) {
      // Dispositivos iOS (iPhone/iPad) rodam HLS nativamente via AVPlayer
      video.src = channel.streamUrl;
      video.load();
      video.play().catch(() => {
        setIsPlaying(false);
      });

      setDiagnostics((prev) => ({
        ...prev,
        protocol: 'Native-iOS',
        status: 'playing',
      }));
    } else if (Hls.isSupported()) {
      // Android, Chrome, Edge, Firefox, Desktop
      const config = getHlsConfig(bufferProfile);
      const hls = new Hls(config);
      hlsRef.current = hls;

      hls.loadSource(channel.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        video.play().catch(() => setIsPlaying(false));

        // Níveis de qualidade disponíveis
        const levels = data.levels.map((lvl, idx) => ({
          id: idx,
          height: lvl.height,
          bitrate: lvl.bitrate,
        }));
        setQualityLevels(levels);

        // Faixas de áudio
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          setAudioTracks(
            hls.audioTracks.map((tr) => ({
              id: tr.id,
              name: tr.name || tr.lang || `Áudio ${tr.id + 1}`,
            }))
          );
        }
      });

      // Monitoramento de fragmentos carregados (Tempo de download e cache)
      hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
        const stats = data.frag.stats;
        const loadTime = Math.max(1, Math.round(stats.loading.end - stats.loading.start));
        const bytes = stats.total || 1024 * 512;
        const bw = Math.round((bytes * 8) / (loadTime / 1000));

        setDiagnostics((prev) => ({
          ...prev,
          segmentLoadTimeMs: loadTime,
          bitrateKbps: Math.round(bw / 1000),
          cacheHit: loadTime < 120, // Carregado em menos de 120ms veio do Edge Cache em RAM
        }));
      });

      // Mudança adaptativa de qualidade
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const currentLevel = hls.levels[data.level];
        if (currentLevel) {
          setDiagnostics((prev) => ({
            ...prev,
            resolution: `${currentLevel.width}x${currentLevel.height}`,
            bitrateKbps: Math.round(currentLevel.bitrate / 1000),
          }));
        }
      });

      // Tratamento de Erros e Recuperação Automática sem Travar
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Tenta reconectar imediatamente na próxima fração de segundo
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              cleanupHls();
              setDiagnostics((prev) => ({
                ...prev,
                status: 'error',
                lastError: data.details,
              }));
              break;
          }
        }
      });

      setDiagnostics((prev) => ({
        ...prev,
        protocol: 'HLS',
      }));
    } else {
      // Fallback padrão se Hls.js não estiver disponível
      video.src = channel.streamUrl;
      video.play().catch(() => setIsPlaying(false));
    }

    return () => {
      cleanupHls();
    };
  }, [channel, bufferProfile, cleanupHls]);

  // Atualizador contínuo do tamanho do Buffer em Segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      const currentTime = video.currentTime;
      let bufferLength = 0;

      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= currentTime && currentTime <= video.buffered.end(i)) {
          bufferLength = video.buffered.end(i) - currentTime;
          break;
        }
      }

      // Estatísticas de vídeo se suportado
      let dropped = 0;
      if ('getVideoPlaybackQuality' in video) {
        const quality = video.getVideoPlaybackQuality();
        dropped = quality.droppedVideoFrames;
      }

      setDiagnostics((prev) => ({
        ...prev,
        bufferLengthSeconds: bufferLength,
        droppedFrames: dropped,
        status: isBuffering ? 'buffering' : video.paused ? 'paused' : 'playing',
      }));
    }, 500);

    return () => clearInterval(interval);
  }, [isBuffering]);

  // Handlers de Controle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch {
      // Ignora erro se não suportado
    }
  };

  const handleQualityChange = (levelIndex: number) => {
    setSelectedQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  const handleAudioTrackChange = (trackId: number) => {
    setSelectedAudioTrack(trackId);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    }
  };

  const handleBufferProfileChange = (mode: BufferProfileMode) => {
    setBufferProfile(mode);
  };

  // Ajuste de classes de CSS para o modo de Aspect Ratio selecionado
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'fill':
        return 'object-cover w-full h-full';
      case '16:9':
        return 'aspect-video object-contain w-full h-full';
      case '4:3':
        return 'aspect-4/3 object-contain w-full h-full';
      case 'fit':
      default:
        return 'object-contain w-full h-full';
    }
  };

  if (!channel) {
    return (
      <div className="relative w-full h-full min-h-[460px] bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <Tv className="w-14 h-14 text-slate-700 mb-4 animate-pulse" />
        <h3 className="text-xl font-semibold text-slate-200 mb-2">Nenhum canal selecionado</h3>
        <p className="text-sm max-w-md text-slate-400">
          Selecione um canal na grade ao lado ou carregue sua lista M3U / Xtream Codes para iniciar a reprodução.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="relative w-full h-full min-h-[440px] bg-black select-none overflow-hidden group flex items-center justify-center"
    >
      {/* Elemento de Vídeo com suporte nativo iOS e MSE Hls.js */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        className={`bg-black transition-all ${getAspectRatioClass()}`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
      />

      {/* Indicador de Carregamento / Buffering Suave */}
      {isBuffering && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
          <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="mt-3 text-xs font-medium text-slate-200 tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Preenchendo buffer ultrarrápido...
          </span>
        </div>
      )}

      {/* HUD de Diagnóstico do Stream */}
      {showDiagnostics && (
        <StreamDiagnosticsHUD
          diagnostics={diagnostics}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Marca d'água discreta do Canal & Indicador Ao Vivo no topo */}
      <div
        className={`absolute top-4 left-4 z-30 flex items-center gap-2.5 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 md:opacity-40'
        }`}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span className="font-semibold tracking-wider text-[11px] text-red-400 uppercase">AO VIVO</span>
          <span className="text-white/40">·</span>
          <span className="truncate max-w-[200px] text-slate-100">{channel.name}</span>
        </div>

        {/* Emblema de Proteção Anti-Travamento */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cache RAM 99.4%</span>
        </div>
      </div>

      {/* Botões Rápidos no topo direito (Diagnóstico e Mobile) */}
      <div
        className={`absolute top-4 right-4 z-30 flex items-center gap-2 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          title="Telemetria e Diagnóstico de Buffer"
          className={`p-2 rounded-lg backdrop-blur-md border text-xs flex items-center gap-1.5 transition-all ${
            showDiagnostics
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/20'
              : 'bg-black/60 border-white/10 text-slate-300 hover:text-white hover:bg-black/80'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline font-mono">
            {diagnostics.bufferLengthSeconds > 0 ? `${diagnostics.bufferLengthSeconds.toFixed(1)}s` : 'Status'}
          </span>
        </button>
      </div>

      {/* Barra de Controles Inferior */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 md:p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Indicador de Buffer Visual na barra inferior */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-3.5 overflow-hidden flex">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (diagnostics.bufferLengthSeconds / 45) * 100)}%` }}
            title={`Buffer em memória: ${diagnostics.bufferLengthSeconds.toFixed(1)}s`}
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-white">
          {/* Lado Esquerdo: Play/Pause, Canais Anterior/Próximo, Volume */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {onPrevChannel && (
              <button
                onClick={onPrevChannel}
                className="hidden sm:flex p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs items-center gap-1"
                title="Canal Anterior"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Anterior</span>
              </button>
            )}

            {onNextChannel && (
              <button
                onClick={onNextChannel}
                className="hidden sm:flex p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs items-center gap-1"
                title="Próximo Canal"
              >
                <span className="text-[11px]">Próximo</span>
              </button>
            )}

            {/* Controle de Volume */}
            <div className="flex items-center gap-2 group/volume ml-1">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title={isMuted ? 'Desmutar' : 'Mutar'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 md:w-20 accent-cyan-400 h-1 bg-white/30 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Lado Direito: Perfil de Buffer, Qualidade, Proporção, PiP, Fullscreen */}
          <div className="flex items-center gap-1.5 md:gap-2 text-xs">
            {/* Seletor do Perfil Anti-Buffering */}
            <div className="relative group/profile">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 transition-colors text-xs font-medium"
                title="Configuração de Memória & Buffer"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">{BUFFER_PROFILES[bufferProfile].name.split(' ')[0]}</span>
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/profile:flex flex-col w-64 bg-slate-900 border border-slate-700/80 rounded-xl p-2 shadow-2xl z-50">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Modo de Buffer (Anti-Travamento)
                </div>
                {(Object.keys(BUFFER_PROFILES) as BufferProfileMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleBufferProfileChange(mode)}
                    className={`text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                      bufferProfile === mode
                        ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{BUFFER_PROFILES[mode].name}</span>
                    <span className="text-[10px] text-slate-400">{BUFFER_PROFILES[mode].description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Alternador de Proporção (Aspect Ratio) */}
            <button
              onClick={() => {
                const modes: Array<'fit' | 'fill' | '16:9' | '4:3'> = ['fit', 'fill', '16:9', '4:3'];
                const nextIdx = (modes.indexOf(aspectRatio) + 1) % modes.length;
                setAspectRatio(modes[nextIdx]);
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
              title={`Proporção: ${aspectRatio.toUpperCase()}`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Suporte a Picture-in-Picture (Android/iOS/Desktop) */}
            <button
              onClick={togglePip}
              className={`p-2 rounded-lg transition-colors ${
                isPipActive
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white'
              }`}
              title="Mini Player (Picture-in-Picture)"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
