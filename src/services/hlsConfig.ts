import type { BufferProfile, BufferProfileMode } from '../types/iptv';
import Hls, { type HlsConfig } from 'hls.js';

export const BUFFER_PROFILES: Record<BufferProfileMode, BufferProfile> = {
  anti_freeze: {
    id: 'anti_freeze',
    name: 'Anti-Travamento (Buffer Alto)',
    description: 'Carrega até 45s adiantado em memória. Ideal para conexões instáveis e Wi-Fi oscilante.',
    maxBufferLength: 45,
    maxMaxBufferLength: 90,
    maxBufferSize: 60 * 1000 * 1000, // 60MB
    liveSyncDuration: 6,
    liveMaxLatencyDuration: 20,
  },
  balanced: {
    id: 'balanced',
    name: 'Equilibrado (Recomendado)',
    description: '30s de buffer com sincronização estável e tempo de resposta ágil ao trocar de canal.',
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    maxBufferSize: 40 * 1000 * 1000, // 40MB
    liveSyncDuration: 4,
    liveMaxLatencyDuration: 12,
  },
  low_latency: {
    id: 'low_latency',
    name: 'Baixa Latência (Ao Vivo / Esportes)',
    description: 'Menor delay em relação à transmissão ao vivo (10s de buffer). Ótimo para futebol ao vivo.',
    maxBufferLength: 12,
    maxMaxBufferLength: 25,
    maxBufferSize: 25 * 1000 * 1000, // 25MB
    liveSyncDuration: 2.5,
    liveMaxLatencyDuration: 8,
  },
};

export function getHlsConfig(profileMode: BufferProfileMode = 'anti_freeze'): Partial<HlsConfig> {
  const profile = BUFFER_PROFILES[profileMode] || BUFFER_PROFILES.balanced;

  return {
    enableWorker: true, // Demuxing em thread separada para não travar a UI (60 FPS garantidos)
    lowLatencyMode: profileMode === 'low_latency',
    
    // Configurações de Buffer para eliminação de travamentos
    maxBufferLength: profile.maxBufferLength,
    maxMaxBufferLength: profile.maxMaxBufferLength,
    maxBufferSize: profile.maxBufferSize,
    backBufferLength: 15, // Mantém 15s para trás caso o usuário queira rebobinar um pouco
    
    // Live Edge Sync
    liveSyncDuration: profile.liveSyncDuration,
    liveMaxLatencyDuration: profile.liveMaxLatencyDuration,
    liveDurationInfinity: true,
    
    // Resiliência de Rede & Retentativas automáticas
    manifestLoadingTimeOut: 15000,
    manifestLoadingMaxRetry: 5,
    manifestLoadingRetryDelay: 1000,
    
    levelLoadingTimeOut: 15000,
    levelLoadingMaxRetry: 5,
    levelLoadingRetryDelay: 1000,
    
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 6,
    fragLoadingRetryDelay: 1000,
    
    // ABR (Adaptive Bitrate) - suavização de banda
    abrEwmaDefaultEstimate: 5000000, // Inicia estimando 5 Mbps para carregamento rápido
    abrBandWidthFactor: 0.85, // 85% de margem de segurança para evitar pedir qualidade acima do canal
    abrBandWidthUpFactor: 0.7,
    
    // Início imediato sem esperar carregar playlist inteira
    startFragPrefetch: true,
    testBandwidth: true,
    progressive: true,
  };
}

/**
 * Detecta se o dispositivo é iOS (iPhone, iPad, iPod)
 * No iOS Safari e WebViews, o HLS deve rodar no player nativo do navegador via canPlayType
 */
export function isAppleDevice(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
