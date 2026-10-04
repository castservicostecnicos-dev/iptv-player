import type { Channel, Category } from '../types/iptv';

export interface M3uParseResult {
  channels: Channel[];
  categories: Category[];
  totalChannels: number;
}

/**
 * Analisador ultra-robusto de listas M3U, M3U_PLUS e listas de texto simples
 */
export function parseM3uContent(content: string, defaultCategory: string = 'Geral'): M3uParseResult {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  const categoryMap = new Map<string, number>();

  let currentInfo: Partial<Channel> | null = null;
  let channelIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Linha de Cabeçalho / Metadados do Canal
    if (line.startsWith('#EXTINF:')) {
      currentInfo = {};

      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i) || line.match(/tvg-id='([^']*)'/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i) || line.match(/tvg-name='([^']*)'/i);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i) || line.match(/tvg-logo='([^']*)'/i);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/i) || line.match(/group-title='([^']*)'/i);
      const tvgChNoMatch = line.match(/tvg-chno="([^"]*)"/i);

      const commaIdx = line.lastIndexOf(',');
      let channelName = '';
      if (commaIdx !== -1) {
        channelName = line.substring(commaIdx + 1).trim();
      }

      if (!channelName && tvgNameMatch) {
        channelName = tvgNameMatch[1].trim();
      }
      if (!channelName) {
        channelName = `Canal ${channelIndex}`;
      }

      const category = groupTitleMatch && groupTitleMatch[1].trim()
        ? groupTitleMatch[1].trim()
        : defaultCategory;

      currentInfo = {
        id: tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1] : `ch_${channelIndex}_${Date.now()}`,
        name: channelName,
        category: category,
        logo: tvgLogoMatch ? tvgLogoMatch[1].trim() : undefined,
        number: tvgChNoMatch ? parseInt(tvgChNoMatch[1], 10) : channelIndex,
        epgId: tvgIdMatch ? tvgIdMatch[1] : undefined,
      };
    } else if (line.startsWith('#EXTGRP:') && currentInfo) {
      // Muitas listas brasileiras utilizam #EXTGRP para categorizar
      const grp = line.replace('#EXTGRP:', '').trim();
      if (grp) {
        currentInfo.category = grp;
      }
    } else if (!line.startsWith('#')) {
      // Esta linha pode ser uma URL de stream
      let streamUrl = line.replace(/^["]+|["]+$/g, '').trim(); // Remove aspas acidentais

      if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://') || streamUrl.startsWith('rtmp://') || streamUrl.startsWith('/')) {
        // Se a URL for .ts de Xtream Codes (/live/user/pass/id.ts), converte para .m3u8 para reprodução HLS no navegador
        let playableUrl = streamUrl;
        if (playableUrl.includes('/live/') && playableUrl.endsWith('.ts')) {
          playableUrl = playableUrl.replace(/\.ts$/, '.m3u8');
        }

        // Se a stream estiver em http:// simples, passa pelo proxy para evitar bloqueio de Mixed Content no navegador
        if (playableUrl.startsWith('http://')) {
          playableUrl = `/api/iptv/proxy?url=${encodeURIComponent(playableUrl)}`;
        }

        const channelName = currentInfo?.name || `Canal ${channelIndex}`;
        const cat = currentInfo?.category || defaultCategory;

        const fullChannel: Channel = {
          id: currentInfo?.id || `ch_${channelIndex}`,
          name: channelName,
          category: cat,
          logo: currentInfo?.logo,
          number: currentInfo?.number || channelIndex,
          epgId: currentInfo?.epgId,
          streamUrl: playableUrl,
          isFavorite: false,
        };

        channels.push(fullChannel);
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

        channelIndex++;
        currentInfo = null;
      }
    }
  }

  // Se não encontrou canais com #EXTINF, mas há links http na lista:
  if (channels.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('http://') || line.startsWith('https://')) {
        let playableUrl = line;
        if (playableUrl.startsWith('http://')) {
          playableUrl = `/api/iptv/proxy?url=${encodeURIComponent(playableUrl)}`;
        }
        channels.push({
          id: `simple_ch_${channels.length + 1}`,
          name: `Stream ${channels.length + 1}`,
          category: 'Geral',
          number: channels.length + 1,
          streamUrl: playableUrl,
          isFavorite: false,
        });
      }
    }
    categoryMap.set('Geral', channels.length);
  }

  const categories: Category[] = [
    { id: 'all', name: 'Todos os Canais', count: channels.length },
    { id: 'favorites', name: 'Favoritos', count: 0 },
    ...Array.from(categoryMap.entries())
      .map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        count: count,
      }))
      .sort((a, b) => b.count - a.count),
  ];

  return {
    channels,
    categories,
    totalChannels: channels.length,
  };
}

/**
 * Faz fetch de uma lista M3U a partir de uma URL com fallback inteligente
 */
export async function fetchM3uFromUrl(url: string): Promise<M3uParseResult> {
  const cleanUrl = url.trim();
  let content = '';

  // 1. Tenta baixar via proxy do servidor
  try {
    const proxyUrl = `/api/iptv/m3u?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      content = await res.text();
    }
  } catch (e) {
    console.warn('[m3uParser] Falha no proxy, tentando download direto');
  }

  // 2. Se o proxy não respondeu, tenta fetch direto
  if (!content) {
    const response = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/x-mpegurl, audio/x-mpegurl, text/plain, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar lista M3U. Código de resposta: HTTP ${response.status}`);
    }

    content = await response.text();
  }

  if (!content.includes('#EXTM3U') && !content.includes('#EXTINF') && !content.includes('http')) {
    throw new Error('O conteúdo baixado não parece ser uma lista de reprodução válida.');
  }

  return parseM3uContent(content);
}
