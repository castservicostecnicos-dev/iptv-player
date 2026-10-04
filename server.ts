import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Desabilita rejeição estrita de certificados SSL auto-assinados comuns em provedores IPTV
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

/**
 * Normaliza e extrai Host, Usuário e Senha caso o usuário tenha colado uma URL completa
 */
function normalizeXtreamCredentials(rawUrl: string, rawUser?: string, rawPass?: string) {
  let url = rawUrl.trim();
  let user = (rawUser || '').trim();
  let pass = (rawPass || '').trim();

  // Adiciona http se faltar
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  try {
    const parsed = new URL(url);
    // Se o usuário colou a URL completa do get.php ou player_api.php com query params:
    if (parsed.searchParams.has('username')) {
      user = parsed.searchParams.get('username') || user;
    }
    if (parsed.searchParams.has('password')) {
      pass = parsed.searchParams.get('password') || pass;
    }

    // Se o path contém /live/usuario/senha/...
    const liveMatch = parsed.pathname.match(/\/live\/([^/]+)\/([^/]+)/);
    if (liveMatch && !user && !pass) {
      user = liveMatch[1];
      pass = liveMatch[2];
    }

    // Limpa a URL base para apenas origin (http://servidor:porta)
    const baseHost = `${parsed.protocol}//${parsed.host}`;
    return { baseHost, user, pass };
  } catch {
    return { baseHost: url.replace(/\/+$/, ''), user, pass };
  }
}

/**
 * Parser M3U inteligente no servidor com suporte a #EXTGRP e conversão para .m3u8
 */
function parseM3uOnServer(content: string, baseHost: string) {
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
    } else if (line.startsWith('#EXTGRP:')) {
      // Suporte a #EXTGRP presente em muitas listas brasileiras
      const grp = line.replace('#EXTGRP:', '').trim();
      if (grp) currentGroup = grp;
    } else if (!line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('/'))) {
      let streamUrl = line;
      if (streamUrl.startsWith('/')) {
        streamUrl = `${baseHost}${streamUrl}`;
      }

      // Converte .ts para .m3u8 se for URL padrão Xtream Codes (/live/user/pass/id.ts)
      if (streamUrl.includes('/live/') && streamUrl.endsWith('.ts')) {
        streamUrl = streamUrl.replace(/\.ts$/, '.m3u8');
      }

      channels.push({
        num: chId,
        name: currentTitle || `Canal ${chId}`,
        stream_type: 'live',
        stream_id: `ch_${chId}`,
        stream_icon: currentLogo,
        category_id: currentGroup,
        direct_source: streamUrl,
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

  // Aceita payloads maiores para listas M3U longas (até 50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  // 1. ENDPOINT DE AUTENTICAÇÃO E CARREGAMENTO INTELIGENTE XTREAM / M3U
  // ---------------------------------------------------------------------------
  app.post('/api/iptv/auth', async (req: Request, res: Response) => {
    try {
      const { serverUrl, username, password } = req.body;
      if (!serverUrl) {
        return res.status(400).json({ error: 'Informe o endereço do servidor ou a URL da lista.' });
      }

      // Normaliza credenciais
      const { baseHost, user, pass } = normalizeXtreamCredentials(serverUrl, username, password);

      console.log(`[IPTV Auth] Tentando autenticar em "${baseHost}" com usuário "${user}"`);

      // 1. TENTA PRIMEIRO VIA API XTREAM CODES (/player_api.php)
      let authSuccess = false;
      let userInfo: any = null;
      let serverInfo: any = null;
      let categories: any[] = [];
      let streams: any[] = [];
      let diagnosticLogs: string[] = [];

      const headers = {
        'User-Agent': 'IPTVSmartersPro/1.1.1 (Linux; Android 9)',
        'Accept': '*/*',
        'Connection': 'keep-alive',
      };

      if (user && pass) {
        const authUrl = `${baseHost}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
        diagnosticLogs.push(`Testando Xtream API: ${authUrl}`);

        try {
          const authRes = await fetch(authUrl, {
            headers,
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
          });

          diagnosticLogs.push(`Status resposta Xtream: HTTP ${authRes.status}`);

          if (authRes.ok) {
            const text = await authRes.text();
            if (text && text.trim().startsWith('{')) {
              try {
                const json = JSON.parse(text);
                if (json.user_info && json.user_info.auth !== 0) {
                  authSuccess = true;
                  userInfo = json.user_info;
                  serverInfo = json.server_info;
                  diagnosticLogs.push(`Xtream API autenticada com sucesso! Status: ${userInfo.status}`);

                  // Busca canais
                  const streamRes = await fetch(`${baseHost}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&action=get_live_streams`, {
                    headers,
                    signal: AbortSignal.timeout(15000),
                  });
                  if (streamRes.ok) {
                    const stText = await streamRes.text();
                    if (stText.trim().startsWith('[')) {
                      streams = JSON.parse(stText);
                    }
                  }

                  // Busca categorias
                  const catRes = await fetch(`${baseHost}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&action=get_live_categories`, {
                    headers,
                    signal: AbortSignal.timeout(10000),
                  });
                  if (catRes.ok) {
                    const catText = await catRes.text();
                    if (catText.trim().startsWith('[')) {
                      categories = JSON.parse(catText);
                    }
                  }
                }
              } catch (e: any) {
                diagnosticLogs.push(`Erro decodificando JSON Xtream: ${e.message}`);
              }
            }
          }
        } catch (xtreamErr: any) {
          diagnosticLogs.push(`Falha de conexão em player_api.php: ${xtreamErr.message}`);
        }
      }

      // 2. SE XTREAM FALHOU OU SE FOR LINK M3U DIRETO, TENTA /get.php
      if (!authSuccess && user && pass) {
        const m3uPlusUrl = `${baseHost}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus&output=m3u8`;
        diagnosticLogs.push(`Tentando fallback M3U Plus: ${m3uPlusUrl}`);

        try {
          const m3uRes = await fetch(m3uPlusUrl, {
            headers,
            redirect: 'follow',
            signal: AbortSignal.timeout(20000),
          });

          diagnosticLogs.push(`Status resposta get.php: HTTP ${m3uRes.status}`);

          if (m3uRes.ok) {
            const m3uContent = await m3uRes.text();
            if (m3uContent.includes('#EXTM3U') || m3uContent.includes('#EXTINF')) {
              diagnosticLogs.push(`Lista M3U recebida com sucesso! Tamanho: ${m3uContent.length} bytes`);
              const parsed = parseM3uOnServer(m3uContent, baseHost);
              authSuccess = true;
              streams = parsed.channels;
              categories = parsed.categories;
              userInfo = {
                status: 'Active',
                exp_date: 'Ativo (Via Lista M3U Plus)',
                max_connections: '1',
                active_cons: '1',
              };
              serverInfo = { url: baseHost };
            } else {
              diagnosticLogs.push(`Resposta de get.php não continha cabeçalhos M3U válidos: ${m3uContent.substring(0, 100)}`);
            }
          }
        } catch (m3uErr: any) {
          diagnosticLogs.push(`Falha de conexão em get.php: ${m3uErr.message}`);
        }
      }

      // 3. SE O USUÁRIO FORNECEU UMA URL DIRETA DE LISTA M3U (ex: bit.ly ou URL personalizada)
      if (!authSuccess && serverUrl.startsWith('http')) {
        diagnosticLogs.push(`Tentando baixar como URL direta: ${serverUrl}`);
        try {
          const directRes = await fetch(serverUrl, {
            headers,
            redirect: 'follow',
            signal: AbortSignal.timeout(20000),
          });

          if (directRes.ok) {
            const directText = await directRes.text();
            if (directText.includes('#EXTM3U') || directText.includes('#EXTINF')) {
              const parsed = parseM3uOnServer(directText, baseHost);
              authSuccess = true;
              streams = parsed.channels;
              categories = parsed.categories;
              userInfo = { status: 'Active', exp_date: 'Arquivo M3U Direto' };
              serverInfo = { url: baseHost };
            }
          }
        } catch (dirErr: any) {
          diagnosticLogs.push(`Falha ao obter URL direta: ${dirErr.message}`);
        }
      }

      if (authSuccess) {
        return res.json({
          success: true,
          userInfo: userInfo || { status: 'Active' },
          serverInfo: serverInfo || { url: baseHost },
          categories,
          streams,
          diagnosticLogs,
        });
      }

      // Se falhou em todos:
      console.warn('[IPTV Auth Failed] Logs:', diagnosticLogs);
      return res.status(400).json({
        error: 'Não foi possível validar as credenciais no servidor informado.',
        diagnosticLogs,
        suggestion: 'Dica: Se seu provedor usa bloqueio de IP ou portas não padrão, você pode copiar o texto da lista M3U e colar diretamente na aba "Lista M3U / M3U8" -> "Colar Texto", sem depender de conexão externa do servidor.',
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Erro interno no proxy: ${err.message}`,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. ENDPOINT DE DOWNLOAD DE LISTA M3U VIA PROXY
  // ---------------------------------------------------------------------------
  app.get('/api/iptv/m3u', async (req: Request, res: Response) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return res.status(400).send('URL obrigatória');

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'IPTVSmartersPro/1.1.1',
          'Accept': '*/*',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok) {
        return res.status(response.status).send(`Erro do servidor upstream: HTTP ${response.status}`);
      }

      const content = await response.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(content);
    } catch (err: any) {
      return res.status(502).send(`Falha ao baixar lista: ${err.message}`);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. PROXY DE STREAM HLS & SEGMENTOS COM CACHE EM RAM
  // ---------------------------------------------------------------------------
  app.get('/api/iptv/proxy', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Parâmetro url é obrigatório');
    }

    const isSegment = targetUrl.endsWith('.ts') || targetUrl.endsWith('.m4s') || targetUrl.endsWith('.mp4') || targetUrl.endsWith('.aac');

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
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return res.status(response.status).send(`Erro do stream upstream: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.status(response.status);

      ['content-length', 'content-range', 'accept-ranges'].forEach((h) => {
        const val = response.headers.get(h);
        if (val) res.setHeader(h, val);
      });

      const isManifest = targetUrl.includes('.m3u8') || targetUrl.includes('/live/') || contentType.includes('mpegurl');

      if (isManifest) {
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

          const resolvedSegmentUrl = new URL(trimmed, baseUrl).toString();
          return `/api/iptv/proxy?url=${encodeURIComponent(resolvedSegmentUrl)}`;
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('X-Cache-Status', 'MISS-MANIFEST-REWRITTEN');
        return res.send(rewrittenLines.join('\n'));
      }

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
      console.error(`[IPTV Stream Proxy Error]: ${err.message} para ${targetUrl}`);
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
