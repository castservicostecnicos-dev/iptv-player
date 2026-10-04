export interface Channel {
  id: string;
  name: string;
  streamUrl: string;
  logo?: string;
  category: string;
  number?: number;
  epgId?: string;
  currentProgram?: string;
  nextProgram?: string;
  isFavorite?: boolean;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface EpgItem {
  id: string;
  channelId: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
}

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
  useProxy?: boolean;
}

export interface StreamDiagnostics {
  bufferLengthSeconds: number;
  bitrateKbps: number;
  resolution: string;
  fps: number;
  droppedFrames: number;
  latencySeconds: number;
  cacheHit: boolean;
  segmentLoadTimeMs: number;
  audioTrack: string;
  protocol: 'HLS' | 'Native-iOS' | 'M3U8-Direct';
  status: 'playing' | 'buffering' | 'paused' | 'error' | 'idle';
  lastError?: string;
}

export type BufferProfileMode = 'anti_freeze' | 'balanced' | 'low_latency';

export interface BufferProfile {
  id: BufferProfileMode;
  name: string;
  description: string;
  maxBufferLength: number; // in seconds
  maxMaxBufferLength: number;
  maxBufferSize: number; // in bytes
  liveSyncDuration: number; // in seconds
  liveMaxLatencyDuration: number; // in seconds
}

export interface ServerSpecCalculation {
  concurrentUsers: number;
  avgBitrateMbps: number;
  totalEgressGbps: number;
  upstreamIngressMbps: number;
  bandwidthSavedPercent: number;
  ramCacheRequiredGb: number;
  recommendedHardware: {
    cpuCores: number;
    ramGb: number;
    portSpeedGbps: number;
    monthlyCostEstUsd: number;
    providerRecommendations: string[];
  };
}
