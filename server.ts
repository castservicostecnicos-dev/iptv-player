import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache em Memória RAM para Segmentos HLS (.ts / .m4s)
interface CachedChunk {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}
const ramChunkCache = new Map<string, CachedChunk>();
const MAX_CACHE_ITEMS = 250;
const CACHE_TTL_MS = 90 * 1000; // 90 segundos

// Limpeza periódica de cache expirado
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ramChunkCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      ramChunkCache.delete(key);
    }
  }
}, 30000);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Cabeçalhos CORS Globais
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, Origin, Accept');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, X-Cache-Status');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // ---------------------------------------------------------------------------
  // 1. ENDPOINT DE AUTENTICAÇÃO XTREAM CODES VIA PROXY (Bypass CORS & Mixed Content)
  // ---------------------------------------------------------------------------
  app.post('/api/iptv/auth', async (req: Request, res: Response) => {
    try {
      const { serverUrl, username, password } = req.body;
      if (!serverUrl || !username || !password) {
        return res.status(400).json({ error: 'Informe serverUrl, username e password.' });
      }

      const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
      const authUrl = `${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

      console.log(`[IPTV Auth Proxy] Autenticando usuário "${username}" em ${cleanUrl}`);

      const response = await fetch(authUrl, {
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `O servidor IPTV respondeu com código de erro HTTP ${response.status}`,
        });
      }

      const data = await response.json();

      if (!data.user_info || data.user_info.auth === 0) {
        return res.status(401).json({
          error: 'Credenciais inválidas: usuário ou senha incorretos no fornecedor IPTV.',
        });
      }

      // Busca também categorias e canais
      let categories: any[] = [];
      let streams: any[] = [];

      try {
        const catRes = await fetch(`${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`, {
          headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' }
        });
        if (catRes.ok) categories = await catRes.json();
      } catch (e) {
        console.warn('[IPTV Auth Proxy] Falha ao obter categorias, usando fallback');
      }

      try {
        const streamRes = await fetch(`${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`, {
          headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' }
        });
        if (streamRes.ok) streams = await streamRes.json();
      } catch (e) {
        console.warn('[IPTV Auth Proxy] Falha ao obter lista de canais');
      }

      return res.json({
        success: true,
        userInfo: data.user_info,
        serverInfo: data.server_info,
        categories: Array.isArray(categories) ? categories : [],
        streams: Array.isArray(streams) ? streams : [],
      });
    } catch (err: any) {
      console.error('[IPTV Auth Proxy Error]:', err.message);
      return res.status(502).json({
        error: `Não foi possível conectar ao servidor do fornecedor: ${err.message}. Verifique se a URL e a porta estão corretas.`,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. ENDPOINT DE DOWNLOAD DE LISTA M3U VIA PROXY (Bypass CORS)
  // ---------------------------------------------------------------------------
  app.get('/api/iptv/m3u', async (req: Request, res: Response) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send('URL da lista M3U é obrigatória.');
      }

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).send(`Erro ao baixar lista M3U: HTTP ${response.status}`);
      }

      const content = await response.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(content);
    } catch (err: any) {
      return res.status(502).send(`Falha no proxy ao obter lista M3U: ${err.message}`);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. PROXY DE STREAM HLS & SEGMENTOS COM CACHE EM RAM DISK
  // Reescreve playlists (.m3u8) para que todos os chunks passem pelo proxy com CORS!
  // ---------------------------------------------------------------------------
  app.get('/api/iptv/proxy', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Parâmetro url é obrigatório');
    }

    const isManifest = targetUrl.includes('.m3u8') || targetUrl.includes('/live/');
    const isSegment = targetUrl.endsWith('.ts') || targetUrl.endsWith('.m4s') || targetUrl.endsWith('.mp4') || targetUrl.endsWith('.aac');

    // Se for segmento de vídeo e já estiver em RAM:
    if (isSegment && ramChunkCache.has(targetUrl)) {
      const cached = ramChunkCache.get(targetUrl)!;
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('X-Cache-Status', 'HIT-RAM');
      return res.send(cached.buffer);
    }

    try {
      const rangeHeader = req.headers.range;
      const headers: Record<string, string> = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
      };
      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }

      const response = await fetch(targetUrl, {
        headers,
      });

      if (!response.ok) {
        return res.status(response.status).send(`Erro do stream upstream: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.status(response.status);

      // Copia headers de Range / Tamanho
      ['content-length', 'content-range', 'accept-ranges'].forEach((h) => {
        const val = response.headers.get(h);
        if (val) res.setHeader(h, val);
      });

      // Se for Manifest HLS (.m3u8), reescreve os links para passarem pelo proxy com CORS e HTTPS
      if (isManifest || contentType.includes('mpegurl')) {
        const manifestText = await response.text();
        const baseUrl = new URL(targetUrl);

        const rewrittenLines = manifestText.split('\n').map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) {
            // Verifica se há URI dentro de tags como #EXT-X-STREAM-INF ou #EXT-X-KEY
            if (trimmed.startsWith('#EXT-X-KEY:') && trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/, (_, keyUri) => {
                const resolvedKeyUrl = new URL(keyUri, baseUrl).toString();
                return `URI="/api/iptv/proxy?url=${encodeURIComponent(resolvedKeyUrl)}"`;
              });
            }
            return line;
          }

          // Linha com URL de chunk ou sub-manifest
          const resolvedSegmentUrl = new URL(trimmed, baseUrl).toString();
          return `/api/iptv/proxy?url=${encodeURIComponent(resolvedSegmentUrl)}`;
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('X-Cache-Status', 'MISS-MANIFEST-REWRITTEN');
        return res.send(rewrittenLines.join('\n'));
      }

      // Se for segmento binário (.ts / .m4s), lê o buffer e salva em RAM
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (isSegment) {
        if (ramChunkCache.size >= MAX_CACHE_ITEMS) {
          const firstKey = ramChunkCache.keys().next().value;
          if (firstKey) ramChunkCache.delete(firstKey);
        }
        ramChunkCache.set(targetUrl, {
          buffer,
          contentType,
          timestamp: Date.now(),
        });
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Cache-Status', isSegment ? 'MISS-CACHED-TO-RAM' : 'DIRECT');
      return res.send(buffer);
    } catch (err: any) {
      console.error(`[IPTV Stream Proxy Error]: ${err.message} for ${targetUrl}`);
      return res.status(502).send(`Falha ao obter stream: ${err.message}`);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. INTEGRAÇÃO VITE (Dev & Prod)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[OmniStream IPTV] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer();
