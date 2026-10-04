import type { Channel, Category } from '../types/iptv';

export interface XtreamStreamItem {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface XtreamCategoryItem {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export const XtreamService = {
  /**
   * Constrói a URL do stream ao vivo no formato padrão Xtream Codes HLS ou TS
   */
  buildStreamUrl(serverUrl: string, username: string, password: string, streamId: number | string, format: 'm3u8' | 'ts' = 'm3u8'): string {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    return `${cleanUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${format}`;
  },

  /**
   * Constrói a URL da lista M3U Plus do usuário
   */
  buildM3uPlusUrl(serverUrl: string, username: string, password: string): string {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    return `${cleanUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=m3u8`;
  },

  /**
   * Busca as categorias de canais ao vivo
   */
  async getCategories(serverUrl: string, username: string, password: string): Promise<Category[]> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const url = `${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Não foi possível carregar categorias');
    const data: XtreamCategoryItem[] = await res.json();

    const categories: Category[] = [
      { id: 'all', name: 'Todos os Canais', count: 0 },
      { id: 'favorites', name: 'Favoritos', count: 0 },
      ...data.map((cat) => ({
        id: cat.category_id,
        name: cat.category_name,
        count: 0,
      })),
    ];

    return categories;
  },

  /**
   * Busca a lista de canais ao vivo e converte para o formato Channel
   */
  async getLiveStreams(serverUrl: string, username: string, password: string): Promise<Channel[]> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const url = `${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Não foi possível carregar a lista de canais');
    const data: XtreamStreamItem[] = await res.json();

    return data.map((item, index) => {
      return {
        id: String(item.stream_id),
        name: item.name,
        streamUrl: this.buildStreamUrl(serverUrl, username, password, item.stream_id, 'm3u8'),
        logo: item.stream_icon,
        category: item.category_id || 'Geral',
        number: item.num || index + 1,
        epgId: item.epg_channel_id,
        isFavorite: false,
      };
    });
  }
};
