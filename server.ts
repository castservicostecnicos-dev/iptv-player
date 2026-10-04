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
const MAX_CACHE_ITEMS = 300;
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

// Parser M3U simples e rápido para servidor
function parseM3uOnServer(content: string, cleanUrl: string, username: string, password: string) {
  const lines = content.split(/\r?\n/);
  const channels: any[] = [];
  const categoryMap = new Map<string, number>();

  let currentTitle = '';
  let currentLogo = '';
  let currentGroup = 'Geral';
  let chId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const commaIdx = line.lastIndexOf(',');

      currentGroup = groupMatch && groupMatch[1] ? groupMatch[1].trim() : 'Geral';
      currentLogo = logoMatch && logoMatch[1] ? logoMatch[1].trim() : '';
      currentTitle = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : `Canal ${chId}`;
    } else if (!line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://'))) {
      const streamId = `m3u_${chId}`;
      channels.push({
        num: chId,
        name: currentTitle || `Canal ${chId}`,
        stream_type: 'live',
        stream_id: streamId,
        stream_icon: currentLogo,
        category_id: currentGroup,
        direct_source: line,
      });

      categoryMap.set(currentGroup, (categoryMap.get(currentGroup) || 0) + 1);
      chId++;
      currentTitle = '';
    }
  }

  const categories = Array.from(categoryMap.entries()).map(([name]) => ({
    category_id: name,
    category_name: name,
  }));

  return { channels, categories };
}

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
  // 1. ENDPOINT DE AUTENTICAÇÃO XTREAM CODES VIA PROXY (Resiliente e Sem Erro de JSON)
  // ---------------------------------------------------------------------------
  app.post('/api/iptv/auth', async (req: Request, res: Response) => {
    try {
      const { serverUrl, username, password } = req.body;
      if (!serverUrl || !username || !password) {
        return res.status(400).json({ error: 'Informe a URL do servidor, usuário e senha.' });
      }

      // 1. Sanitização de URL (Garante protocolo http:// ou https://)
      let cleanUrl = serverUrl.trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `http://${cleanUrl}`;
      }

      console.log(`[IPTV Auth Proxy] Autenticando usuário "${username}" em ${cleanUrl}`);

      const userAgents = [
        'IPTVSmartersPro/1.1.1 (Linux; Android 9)',
        'VLC/3.0.18 LibVLC/3.0.18',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ];

      let rawAuthText = '';
      let authResponseStatus = 200;

      // Tenta player_api.php com User-Agents conhecidos
      for (const ua of userAgents) {
        try {
          const authUrl = `${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
          const response = await fetch(authUrl, {
            headers: {
              'User-Agent': ua,
              'Accept': 'application/json, text/plain, */*',
            },
            redirect: 'follow',
          });

          authResponseStatus = response.status;
          rawAuthText = await response.text();

          // Se retornou conteúdo com mais de 5 caracteres, pode ser JSON válido
          if (rawAuthText && rawAuthText.trim().length > 5) {
            break;
          }
        } catch (fetchErr: any) {
          console.warn(`[IPTV Auth] Falha com UA ${ua}:`, fetchErr.message);
        }
      }

      // Tenta decodificar o JSON com segurança
      let data: any = null;
      if (rawAuthText && rawAuthText.trim().startsWith('{')) {
        try {
          data = JSON.parse(rawAuthText);
        } catch {
          data = null;
        }
      }

      // SE O SERVIDOR RETORNOU VAZIO OU NÃO-JSON EM player_api.php:
      // Tenta automaticamente o formato M3U Plus via get.php!
      if (!data || !data.user_info) {
        console.log(`[IPTV Auth Proxy] player_api.php não retornou JSON. Tentando fallback via get.php (M3U Plus)...`);

        const m3uPlusUrl = `${cleanUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=m3u8`;
        try {
          const m3uRes = await fetch(m3uPlusUrl, {
            headers: { 'User-Agent': 'IPTVSmartersPro/1.1.1' },
            redirect: 'follow',
          });

          if (m3uRes.ok) {
            const m3uText = await m3uRes.text();
            if (m3uText.includes('#EXTM3U') || m3uText.includes('#EXTINF')) {
              console.log(`[IPTV Auth Proxy] Fallback get.php teve sucesso! Processando canais M3U.`);
              const { channels, categories } = parseM3uOnServer(m3uText, cleanUrl, username, password);

              return res.json({
                success: true,
                userInfo: {
                  status: 'Active',
                  exp_date: 'Ativo (Via M3U Plus)',
                  max_connections: '1',
                  active_cons: '1',
                  message: 'Acesso validado com sucesso via M3U Plus',
                },
                serverInfo: {
                  url: cleanUrl,
                  port: '80',
                  server_protocol: cleanUrl.startsWith('https') ? 'https' : 'http',
                  timezone: 'UTC',
                },
                categories,
                streams: channels,
              });
            }
          }
        } catch (m3uErr: any) {
          console.warn('[IPTV Auth Proxy] Fallback get.php falhou:', m3uErr.message);
        }

        // Se chegou aqui e tem HTML na resposta:
        if (rawAuthText && (rawAuthText.includes('<!DOCTYPE') || rawAuthText.includes('<html'))) {
          return res.status(400).json({
            error: 'O endereço informado retornou uma página web (HTML) em vez da API de IPTV. Verifique se o endereço (ex: http://servidor:porta), o usuário e a senha estão corretos.',
          });
        }

        // Se a resposta foi vazia:
        if (!rawAuthText || rawAuthText.trim() === '') {
          return res.status(400).json({
            error: 'O servidor IPTV respondeu com corpo vazio. Isso ocorre quando o fornecedor bloqueia conexões diretas ou quando a porta está incorreta (ex: use http://seuservidor:8080 com a porta exata fornecida). Você também pode carregar sua lista na aba "Lista M3U / M3U8".',
          });
        }

        return res.status(401).json({
          error: `O servidor IPTV não reconheceu as credenciais (Resposta: "${rawAuthText.substring(0, 120)}"). Verifique usuário e senha.`,
        });
      }

      // Se temos data.user_info do Xtream Codes:
      if (data.user_info.auth === 0) {
        return res.status(401).json({
          error: 'Credenciais inválidas: usuário ou senha incorretos no fornecedor IPTV.',
        });
      }

      // Busca Categorias de forma segura
      let categories: any[] = [];
      try {
        const catRes = await fetch(`${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`, {
          headers: { 'User-Agent': 'IPTVSmartersPro/1.1.1' },
          redirect: 'follow',
        });
        if (catRes.ok) {
          const catText = await catRes.text();
          if (catText && catText.trim().startsWith('[')) {
            categories = JSON.parse(catText);
          }
        }
      } catch (e) {
        console.warn('[IPTV Auth Proxy] Não foi possível obter categorias.');
      }

      // Busca Canais ao Vivo de forma segura
      let streams: any[] = [];
      try {
        const streamRes = await fetch(`${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`, {
          headers: { 'User-Agent': 'IPTVSmartersPro/1.1.1' },
          redirect: 'follow',
        });
        if (streamRes.ok) {
          const streamText = await streamRes.text();
          if (streamText && streamText.trim().startsWith('[')) {
            streams = JSON.parse(streamText);
          }
        }
      } catch (e) {
        console.warn('[IPTV Auth Proxy] Não foi possível obter lista de canais.');
      }

      return res.json({
        success: true,
        userInfo: data.user_info,
        serverInfo: data.server_info || { url: cleanUrl },
        categories: Array.isArray(categories) ? categories : [],
        streams: Array.isArray(streams) ? streams : [],
      });
    } catch (err: any) {
      console.error('[IPTV Auth Proxy Error]:', err.message);
      return res.status(502).json({
        error: `Não foi possível conectar ao fornecedor IPTV: ${err.message}. Verifique a URL e a porta.`,
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
          'User-Agent': 'IPTVSmartersPro/1.1.1',
          'Accept': '*/*',
        },
        redirect: 'follow',
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
        'User-Agent': 'IPTVSmartersPro/1.1.1',
        'Accept': '*/*',
      };
      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }

      const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
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
