import type { Channel, Category } from '../types/iptv';

export interface M3uParseResult {
  channels: Channel[];
  categories: Category[];
  totalChannels: number;
}

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

    if (line.startsWith('#EXTINF:')) {
      currentInfo = {};

      // Extrai atributos no formato chave="valor"
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/i);
      const tvgChNoMatch = line.match(/tvg-chno="([^"]*)"/i);

      // O nome do canal geralmente vem após a última vírgula da linha #EXTINF
      const commaIdx = line.lastIndexOf(',');
      let channelName = '';
      if (commaIdx !== -1) {
        channelName = line.substring(commaIdx + 1).trim();
      }

      // Se não encontrou após a vírgula, usa tvg-name ou fallback
      if (!channelName && tvgNameMatch) {
        channelName = tvgNameMatch[1];
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
        logo: tvgLogoMatch ? tvgLogoMatch[1] : undefined,
        number: tvgChNoMatch ? parseInt(tvgChNoMatch[1], 10) : channelIndex,
        epgId: tvgIdMatch ? tvgIdMatch[1] : undefined,
      };
    } else if (!line.startsWith('#') && currentInfo) {
      // Esta linha é a URL do stream
      const streamUrl = line;
      if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://') || streamUrl.startsWith('rtmp://')) {
        const fullChannel: Channel = {
          id: currentInfo.id || `ch_${channelIndex}`,
          name: currentInfo.name || `Canal ${channelIndex}`,
          category: currentInfo.category || defaultCategory,
          logo: currentInfo.logo,
          number: currentInfo.number || channelIndex,
          epgId: currentInfo.epgId,
          streamUrl: streamUrl,
          isFavorite: false,
        };

        channels.push(fullChannel);

        // Agrupa categorias
        const cat = fullChannel.category;
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

        channelIndex++;
      }
      currentInfo = null;
    }
  }

  // Monta lista de categorias com contagem ordenada por volume
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
 * Faz fetch de uma lista M3U a partir de uma URL
 */
export async function fetchM3uFromUrl(url: string): Promise<M3uParseResult> {
  const cleanUrl = url.trim();
  const response = await fetch(cleanUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/x-mpegurl, audio/x-mpegurl, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar lista M3U. Código de resposta: ${response.status}`);
  }

  const content = await response.text();
  if (!content.includes('#EXTM3U') && !content.includes('#EXTINF')) {
    throw new Error('O conteúdo baixado não parece ser uma lista M3U válida.');
  }

  return parseM3uContent(content);
}
