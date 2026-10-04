import type { Channel, Category, EpgItem } from '../types/iptv';

export const DEMO_CATEGORIES: Category[] = [
  { id: 'all', name: 'Todos os Canais', count: 10 },
  { id: 'favorites', name: 'Favoritos', count: 0 },
  { id: 'sports', name: 'Esportes & Ação', count: 2 },
  { id: 'news', name: 'Notícias 24h', count: 2 },
  { id: 'movies', name: 'Cinema & Ficção', count: 3 },
  { id: 'docs', name: 'Documentários & Ciência', count: 2 },
  { id: 'music', name: 'Música & Variedades', count: 1 },
];

export const DEMO_CHANNELS: Channel[] = [
  {
    id: 'ch_nasa_live',
    name: 'NASA TV HD (Ciência & Espaço)',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    logo: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=128&auto=format&fit=crop&q=80',
    category: 'docs',
    number: 1,
    currentProgram: 'Estação Espacial Internacional (ISS) Ao Vivo',
    nextProgram: 'Missões Artemis & Exploração Lunar',
    isFavorite: true,
  },
  {
    id: 'ch_bbb_1080',
    name: 'UltraCinema 1080p (Multi-Bitrate HLS)',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=128&auto=format&fit=crop&q=80',
    category: 'movies',
    number: 2,
    currentProgram: 'Big Buck Bunny (HLS 60FPS Surround 5.1)',
    nextProgram: 'Festival Internacional de Animação Digital',
    isFavorite: true,
  },
  {
    id: 'ch_redbull_sports',
    name: 'Action Sports HD (Adrenalina Ao Vivo)',
    streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    logo: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=128&auto=format&fit=crop&q=80',
    category: 'sports',
    number: 3,
    currentProgram: 'Mundial de Downhill & Salto Livre Extremo',
    nextProgram: 'X-Games Highlights & Entrevistas',
    isFavorite: false,
  },
  {
    id: 'ch_tears_of_steel',
    name: 'Sci-Fi Prime HD (Cinema HLS)',
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    logo: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=128&auto=format&fit=crop&q=80',
    category: 'movies',
    number: 4,
    currentProgram: 'Tears of Steel (VFX & Áudio Multicanal)',
    nextProgram: 'Bastidores dos Efeitos Visuais de Hollywood',
    isFavorite: false,
  },
  {
    id: 'ch_bloomberg_news',
    name: 'Global Finance & Market 24h',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/url_0/1920_1080/index.m3u8',
    logo: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=128&auto=format&fit=crop&q=80',
    category: 'news',
    number: 5,
    currentProgram: 'Mercados Globais & Fechamento de Wall Street',
    nextProgram: 'Tecnologia & Tendências do Vale do Silício',
    isFavorite: false,
  },
  {
    id: 'ch_sintel_cinema',
    name: 'Cine Classics 4K (Master HDR)',
    streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    logo: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=128&auto=format&fit=crop&q=80',
    category: 'movies',
    number: 6,
    currentProgram: 'Sintel: Saga do Dragão (HLS Adaptativo)',
    nextProgram: 'Clássicos da Computação Gráfica Mundial',
    isFavorite: false,
  },
  {
    id: 'ch_sports_arena',
    name: 'Super Liga Sports (Low Latency HLS)',
    streamUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=128&auto=format&fit=crop&q=80',
    category: 'sports',
    number: 7,
    currentProgram: 'Campeonato Internacional de Velocidade',
    nextProgram: 'Resumo da Rodada & Gols do Fim de Semana',
    isFavorite: false,
  },
  {
    id: 'ch_geo_wild',
    name: 'Terra Selvagem Documentários',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=128&auto=format&fit=crop&q=80',
    category: 'docs',
    number: 8,
    currentProgram: 'Predadores do Ártico: Sobrevivência no Gelo',
    nextProgram: 'Oceano Profundo: Criaturas do Abismo',
    isFavorite: false,
  },
  {
    id: 'ch_live_news_br',
    name: 'InfoNews Brasil & Mundo 24h',
    streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=128&auto=format&fit=crop&q=80',
    category: 'news',
    number: 9,
    currentProgram: 'Edição Noturna: Principais Fatos do Dia',
    nextProgram: 'Panorama Econômico & Clima',
    isFavorite: false,
  },
  {
    id: 'ch_groove_music',
    name: 'Groove Hits TV (Som & Luzes)',
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    logo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=128&auto=format&fit=crop&q=80',
    category: 'music',
    number: 10,
    currentProgram: 'Top 50 Músicas Mais Tocadas no Mundo',
    nextProgram: 'Sessão Acústica Ao Vivo',
    isFavorite: false,
  },
];

export function getChannelEpgSchedule(channelId: string): EpgItem[] {
  const now = new Date();
  const baseTime = new Date(now.getTime() - 35 * 60 * 1000); // Começou há 35 min

  const program1Start = baseTime;
  const program1End = new Date(baseTime.getTime() + 60 * 60 * 1000); // Dura 60 min

  const program2Start = program1End;
  const program2End = new Date(program1End.getTime() + 90 * 60 * 1000);

  const program3Start = program2End;
  const program3End = new Date(program2End.getTime() + 120 * 60 * 1000);

  return [
    {
      id: `${channelId}_epg_1`,
      channelId,
      title: 'Transmissão Principal Ao Vivo',
      start: program1Start,
      end: program1End,
      description: 'Transmissão contínua em alta definição HLS com múltiplos perfis de resolução e áudio estéreo imersivo.',
    },
    {
      id: `${channelId}_epg_2`,
      channelId,
      title: 'Edição Especial de Destaques',
      start: program2Start,
      end: program2End,
      description: 'Análise dos principais momentos, entrevistas exclusivas e bastidores da produção.',
    },
    {
      id: `${channelId}_epg_3`,
      channelId,
      title: 'Sessão da Madrugada',
      start: program3Start,
      end: program3End,
      description: 'Programação de filmes e episódios especiais com qualidade aprimorada.',
    },
  ];
}
