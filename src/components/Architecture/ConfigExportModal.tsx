import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Server, Terminal, Shield } from 'lucide-react';

interface ConfigExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConfigTab = 'nginx' | 'docker' | 'sysctl' | 'node';

export const ConfigExportModal: React.FC<ConfigExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('nginx');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const CONFIG_FILES: Record<ConfigTab, { filename: string; title: string; language: string; content: string }> = {
    nginx: {
      filename: 'nginx.conf',
      title: 'Configuração Nginx com Cache em RAM Disk (/dev/shm)',
      language: 'nginx',
      content: `# ==============================================================================
# OMNISTREAM DEDICATED EDGE CACHE - NGINX REVERSE PROXY
# Cache de segmentos HLS (.ts / .m4s) em RAM Disk com Thundering Herd Protection
# ==============================================================================

user www-data;
worker_processes auto;
worker_rlimit_nofile 1048576;

events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Otimizações de Zero-Copy I/O para streaming HLS
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 10000;
    reset_timedout_connection on;

    # Alocação de Cache em RAM Disk (tmpfs /dev/shm)
    # Garante leitura em 0ms sem desgastar discos NVMe/SSD
    proxy_cache_path /dev/shm/hls_cache 
                     levels=1:2 
                     keys_zone=HLS_RAM_CACHE:128m 
                     max_size=16g 
                     inactive=3m 
                     use_temp_path=off;

    # Formato de Log com Status do Cache (HIT / MISS / EXPIRED)
    log_format hls_metrics '$remote_addr [$time_local] "$request" '
                           '$status $body_bytes_sent Cache:$upstream_cache_status '
                           'UpstreamTime:$upstream_response_time RequestTime:$request_time';

    access_log /var/log/nginx/hls_access.log hls_metrics buffer=64k flush=5s;
    error_log /var/log/nginx/hls_error.log warn;

    upstream iptv_provider {
        # Insira aqui o IP ou DNS do seu fornecedor IPTV
        server 185.220.101.42:8080 max_fails=3 fail_timeout=10s;
        keepalive 128;
    }

    server {
        listen 80;
        listen 443 ssl http2;
        server_name stream.seuservidor.com;

        # Certificados SSL / HTTPS (Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/stream.seuservidor.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/stream.seuservidor.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Headers de CORS Obrigatórios para Players Web, iOS e Android
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, HEAD, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Range, Authorization, Accept, Origin' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length, Content-Range' always;
        add_header 'X-Cache-Status' $upstream_cache_status always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # ----------------------------------------------------------------------
        # 1. Regra para Manifests e Playlists (.m3u8)
        # Playlist muda dinamicamente a cada 2 segundos. TTL deve ser muito curto!
        # ----------------------------------------------------------------------
        location ~* \\.m3u8$ {
            proxy_pass http://iptv_provider;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;

            proxy_cache HLS_RAM_CACHE;
            proxy_cache_key "$uri?$args";
            proxy_cache_valid 200 2s; # Manifest expira em 2 segundos
            
            # Não acumular cache desnecessário de manifests
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # ----------------------------------------------------------------------
        # 2. Regra para Segmentos de Vídeo (.ts / .m4s / .mp4 / .aac)
        # Segmentos são IMUTÁVEIS. Devem ficar em RAM para servir milhares de clientes!
        # ----------------------------------------------------------------------
        location ~* \\.(ts|m4s|mp4|aac)$ {
            proxy_pass http://iptv_provider;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;

            proxy_cache HLS_RAM_CACHE;
            proxy_cache_key "$uri";
            
            # Cache por 120 segundos na memória RAM
            proxy_cache_valid 200 206 120s;
            proxy_cache_valid 404 1s;

            # EVITA O "THUNDERING HERD" (Múltiplos clientes pedindo o mesmo pedaço):
            # Se 1000 clientes pedirem o segmento_100.ts ao mesmo tempo,
            # o Nginx faz APENAS 1 requisição ao fornecedor e serve todos da RAM!
            proxy_cache_lock on;
            proxy_cache_lock_timeout 5s;
            proxy_cache_lock_age 5s;

            # Se o servidor do fornecedor oscilar, serve o pedaço em cache
            proxy_cache_use_stale error timeout updating invalid_header http_500 http_502 http_503 http_504;

            # Suporte a Byte-Ranges para Players iOS e Android
            proxy_force_ranges on;
            proxy_ignore_headers Cache-Control Expires Set-Cookie;
        }

        # Endpoint de Autenticação Xtream Codes
        location /player_api.php {
            proxy_pass http://iptv_provider;
            proxy_set_header Host $host;
            proxy_cache off; # Credenciais de autenticação nunca devem ser cacheadas
        }
    }
}`,
    },
    docker: {
      filename: 'docker-compose.yml',
      title: 'Docker Compose com Nginx Edge Cache + Certbot SSL',
      language: 'yaml',
      content: `version: '3.8'

services:
  edge-cache:
    image: nginx:alpine
    container_name: omnistream_cache_edge
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    # Monta a memória RAM do servidor diretamente no container (/dev/shm)
    tmpfs:
      - /dev/shm/hls_cache:size=16G,mode=1777
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
    networks:
      - iptv_net

  certbot:
    image: certbot/certbot
    container_name: certbot_ssl
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait; done;'"
    networks:
      - iptv_net

networks:
  iptv_net:
    driver: bridge`,
    },
    sysctl: {
      filename: 'sysctl-tuning.conf',
      title: 'Otimizações de Kernel Linux para 10 Gbps Streaming (TCP BBR)',
      language: 'ini',
      content: `# ==============================================================================
# LINUX KERNEL TUNING PARA STREAMING HLS DE ALTA CAPACIDADE (10 Gbps)
# Salve em /etc/sysctl.d/99-iptv-streaming.conf e execute: sysctl -p /etc/sysctl.d/99-iptv-streaming.conf
# ==============================================================================

# Algoritmo de Congestionamento TCP BBR (Google)
# Elimina a perda de pacotes e melhora o throughput em conexões residenciais
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Tamanho máximo de conexões em fila (evita SYN Drop durante jogos ao vivo)
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Buffer de Rede (Socket Memory) para 10 Gbps
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.core.rmem_default = 33554432
net.core.wmem_default = 33554432
net.ipv4.tcp_rmem = 4096 87380 33554432
net.ipv4.tcp_wmem = 4096 65536 33554432

# Reutilização de Sockets em TIME_WAIT
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Janela TCP Escalonável
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1

# Limite de Arquivos Abertos no Sistema Operacional
fs.file-max = 2097152`,
    },
    node: {
      filename: 'stream-proxy.ts',
      title: 'Script de Proxy Inteligente em TypeScript (Bypass CORS & Token)',
      language: 'typescript',
      content: `import express from 'express';
import axios from 'axios';
import stream from 'stream';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de CORS para permitir Web, Android e iOS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Proxy de segmentos HLS e manifests com mascaramento de cabeçalho
app.get('/api/proxy/stream', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send('URL do stream é obrigatória');

  try {
    const upstreamResponse = await axios({
      method: 'get',
      url: targetUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
      timeout: 10000,
    });

    res.status(upstreamResponse.status);
    Object.entries(upstreamResponse.headers).forEach(([key, val]) => {
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
        res.setHeader(key, val as string);
      }
    });

    upstreamResponse.data.pipe(res);
  } catch (err: any) {
    res.status(502).send('Falha ao obter stream da origem');
  }
});

app.listen(PORT, () => console.log('Proxy ativo na porta ' + PORT));`,
    },
  };

  const currentFile = CONFIG_FILES[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Arquivos de Configuração do Servidor Dedicado
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Modelos prontos para produção com cache em RAM disk e eliminação de travamentos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Abas */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/80 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('nginx')}
            className={`py-2 px-3.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'nginx'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>nginx.conf (RAM Disk HLS)</span>
          </button>

          <button
            onClick={() => setActiveTab('docker')}
            className={`py-2 px-3.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'docker'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>docker-compose.yml</span>
          </button>

          <button
            onClick={() => setActiveTab('sysctl')}
            className={`py-2 px-3.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sysctl'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>sysctl.conf (TCP BBR 10G)</span>
          </button>

          <button
            onClick={() => setActiveTab('node')}
            className={`py-2 px-3.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'node'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>stream-proxy.ts</span>
          </button>
        </div>

        {/* Visualizador de Código com Ações */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-950">
          <div className="flex items-center justify-between pb-3 mb-2 text-xs border-b border-slate-800">
            <span className="font-mono text-cyan-400 font-semibold">{currentFile.filename}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 overflow-auto p-4 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-200 font-mono text-[11px] leading-relaxed selection:bg-cyan-500/30">
            <code>{currentFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
