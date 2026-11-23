import type { Activity, Level, Verdict } from '../engine';

export const LANGS = ['es', 'ca', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const LOCALES: Record<Lang, string> = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB' };

type Range = { range: string; min: string; max: string };

export interface Messages {
  langName: string;
  tagline: string;
  theme: { toDark: string; toLight: string };
  location: {
    label: string;
    placeholder: string;
    useMine: string;
    locating: string;
    searching: string;
    noResults: string;
    current: string;
    denied: string;
    unsupported: string;
    searchError: string;
    choose: string;
    change: string;
  };
  activity: Record<Activity, string>;
  activityLabel: string;
  duration: { label: string; allDay: string; hours: (h: number) => string; minutes: (m: number) => string };
  day: { label: string; today: string; tomorrow: string };
  loading: string;
  loadError: string;
  retry: string;
  verdict: Record<Verdict, { title: string; detail: string }>;
  window: { label: string; now: string };
  betterLater: (start: string, end: string) => string;
  confidence: { medium: string; low: string };
  reasons: {
    rain: Record<Level, (p: { prob: string | null; mm: string }) => string>;
    temp: {
      good: (r: Range) => string;
      cold: Record<Exclude<Level, 'good'>, (r: Range) => string>;
      hot: Record<Exclude<Level, 'good'>, (r: Range) => string>;
    };
    wind: Record<Level, (gust: string) => string>;
    uv: Record<Level, (uv: string) => string>;
    storm: string;
    freezing: string;
    heavySnow: string;
    fog: string;
    noTimeLeft: string;
  };
  hourly: { title: string; rain: string; gusts: string; feels: string; empty: string };
  levels: Record<Level, string>;
  range: (start: string, end: string) => string;
  footer: { weather: string; geocoding: string; disclaimer: string };
}

const es: Messages = {
  langName: 'Español',
  tagline: '¿Es buen momento para entrenar al aire libre?',
  theme: { toDark: 'Cambiar a modo oscuro', toLight: 'Cambiar a modo claro' },
  location: {
    label: 'Ubicación',
    placeholder: 'Busca una ciudad o un lugar…',
    useMine: 'Usar mi ubicación',
    locating: 'Obteniendo tu ubicación…',
    searching: 'Buscando…',
    noResults: 'Sin resultados',
    current: 'Ubicación actual',
    denied: 'No se ha podido obtener tu ubicación. Busca una ciudad.',
    unsupported: 'Tu navegador no permite la geolocalización. Busca una ciudad.',
    searchError: 'La búsqueda ha fallado. Inténtalo de nuevo.',
    choose: 'Elige una ubicación para ver la recomendación.',
    change: 'Cambiar',
  },
  activity: { running: 'Correr', hiking: 'Senderismo' },
  activityLabel: 'Actividad',
  duration: {
    label: 'Duración',
    allDay: 'Todo el día',
    hours: (h) => `${h} h`,
    minutes: (m) => `${m} min`,
  },
  day: { label: 'Día', today: 'Hoy', tomorrow: 'Mañana' },
  loading: 'Cargando la previsión…',
  loadError: 'No se ha podido cargar la previsión.',
  retry: 'Reintentar',
  verdict: {
    GO_NOW: { title: '¡Sal ahora!', detail: 'Las condiciones son buenas ahora mismo.' },
    BEST_WINDOW: { title: 'Mejor franja', detail: 'Esta es la mejor franja del día para tu actividad.' },
    LOW_PROB_WINDOW: {
      title: 'Franja con menos riesgo',
      detail: 'Las condiciones no son ideales: esta es la franja más segura, con menos riesgo de lluvia o mal tiempo.',
    },
    GYM: {
      title: 'Mejor al gimnasio',
      detail: 'No hay una buena franja al aire libre, pero puedes salir para entrenar bajo techo.',
    },
    STAY_HOME: { title: 'Quédate en casa', detail: 'Condiciones adversas o peligrosas: mejor no salir.' },
  },
  window: { label: 'Franja recomendada', now: 'Ahora' },
  betterLater: (s, e) => `Aún mejor de ${s} a ${e}.`,
  confidence: {
    medium: 'Previsión a varios días vista: puede cambiar.',
    low: 'Previsión lejana: tómala como orientativa.',
  },
  reasons: {
    rain: {
      good: ({ prob }) => (prob ? `Seco: probabilidad de lluvia máx. ${prob}` : 'No se prevé lluvia'),
      fair: ({ prob, mm }) => `Riesgo de chubascos (hasta ${prob ?? mm})`,
      poor: ({ prob, mm }) => `Lluvia probable (${prob ? `${prob}, ` : ''}hasta ${mm})`,
      hazard: ({ mm }) => `Lluvia intensa (hasta ${mm})`,
    },
    temp: {
      good: ({ range }) => `Sensación térmica agradable: ${range}`,
      cold: {
        fair: ({ range }) => `Fresco: sensación de ${range}`,
        poor: ({ range }) => `Frío intenso: sensación de ${range}`,
        hazard: ({ min }) => `Frío extremo: sensación de ${min}`,
      },
      hot: {
        fair: ({ range }) => `Calor: sensación de ${range}`,
        poor: ({ range }) => `Mucho calor: sensación de ${range}`,
        hazard: ({ max }) => `Calor extremo: sensación de ${max}`,
      },
    },
    wind: {
      good: (g) => `Viento suave (rachas de hasta ${g})`,
      fair: (g) => `Viento moderado (rachas de hasta ${g})`,
      poor: (g) => `Viento fuerte (rachas de hasta ${g})`,
      hazard: (g) => `Rachas peligrosas de hasta ${g}`,
    },
    uv: {
      good: (uv) => `Índice UV ${uv}: usa protección solar`,
      fair: (uv) => `UV alto (${uv}): protección solar imprescindible`,
      poor: (uv) => `UV muy alto (${uv}): evita las horas centrales`,
      hazard: (uv) => `UV extremo (${uv})`,
    },
    storm: 'Tormentas eléctricas previstas',
    freezing: 'Lluvia o llovizna helada',
    heavySnow: 'Nevadas intensas',
    fog: 'Niebla: visibilidad reducida en el camino',
    noTimeLeft: 'Hoy ya no quedan horas adecuadas: prueba mañana',
  },
  hourly: { title: 'Hora a hora', rain: 'Lluvia', gusts: 'Rachas', feels: 'Sensación', empty: 'No hay horas disponibles para este día.' },
  levels: { good: 'Bueno', fair: 'Regular', poor: 'Malo', hazard: 'Peligroso' },
  range: (s, e) => `Horario considerado: ${s}–${e}`,
  footer: {
    weather: 'Datos meteorológicos',
    geocoding: 'Geolocalización inversa',
    disclaimer: 'Recomendación orientativa basada en previsiones; usa siempre tu criterio.',
  },
};

const ca: Messages = {
  langName: 'Català',
  tagline: 'És bon moment per entrenar a l’aire lliure?',
  theme: { toDark: 'Canvia a mode fosc', toLight: 'Canvia a mode clar' },
  location: {
    label: 'Ubicació',
    placeholder: 'Cerca una ciutat o un lloc…',
    useMine: 'Fes servir la meva ubicació',
    locating: 'Obtenint la teva ubicació…',
    searching: 'Cercant…',
    noResults: 'Cap resultat',
    current: 'Ubicació actual',
    denied: 'No s’ha pogut obtenir la teva ubicació. Cerca una ciutat.',
    unsupported: 'El teu navegador no permet la geolocalització. Cerca una ciutat.',
    searchError: 'La cerca ha fallat. Torna-ho a provar.',
    choose: 'Tria una ubicació per veure la recomanació.',
    change: 'Canvia',
  },
  activity: { running: 'Córrer', hiking: 'Senderisme' },
  activityLabel: 'Activitat',
  duration: {
    label: 'Durada',
    allDay: 'Tot el dia',
    hours: (h) => `${h} h`,
    minutes: (m) => `${m} min`,
  },
  day: { label: 'Dia', today: 'Avui', tomorrow: 'Demà' },
  loading: 'Carregant la previsió…',
  loadError: 'No s’ha pogut carregar la previsió.',
  retry: 'Torna-ho a provar',
  verdict: {
    GO_NOW: { title: 'Surt ara!', detail: 'Les condicions són bones ara mateix.' },
    BEST_WINDOW: { title: 'Millor franja', detail: 'Aquesta és la millor franja del dia per a la teva activitat.' },
    LOW_PROB_WINDOW: {
      title: 'Franja amb menys risc',
      detail: 'Les condicions no són ideals: aquesta és la franja més segura, amb menys risc de pluja o mal temps.',
    },
    GYM: {
      title: 'Millor al gimnàs',
      detail: 'No hi ha cap bona franja a l’aire lliure, però pots sortir per entrenar a cobert.',
    },
    STAY_HOME: { title: 'Queda’t a casa', detail: 'Condicions adverses o perilloses: millor no sortir.' },
  },
  window: { label: 'Franja recomanada', now: 'Ara' },
  betterLater: (s, e) => `Encara millor de ${s} a ${e}.`,
  confidence: {
    medium: 'Previsió a uns quants dies vista: pot canviar.',
    low: 'Previsió llunyana: pren-la com a orientativa.',
  },
  reasons: {
    rain: {
      good: ({ prob }) => (prob ? `Sec: probabilitat de pluja màx. ${prob}` : 'No es preveu pluja'),
      fair: ({ prob, mm }) => `Risc de ruixats (fins a ${prob ?? mm})`,
      poor: ({ prob, mm }) => `Pluja probable (${prob ? `${prob}, ` : ''}fins a ${mm})`,
      hazard: ({ mm }) => `Pluja intensa (fins a ${mm})`,
    },
    temp: {
      good: ({ range }) => `Sensació tèrmica agradable: ${range}`,
      cold: {
        fair: ({ range }) => `Fresc: sensació de ${range}`,
        poor: ({ range }) => `Fred intens: sensació de ${range}`,
        hazard: ({ min }) => `Fred extrem: sensació de ${min}`,
      },
      hot: {
        fair: ({ range }) => `Calor: sensació de ${range}`,
        poor: ({ range }) => `Molta calor: sensació de ${range}`,
        hazard: ({ max }) => `Calor extrema: sensació de ${max}`,
      },
    },
    wind: {
      good: (g) => `Vent suau (ràfegues de fins a ${g})`,
      fair: (g) => `Vent moderat (ràfegues de fins a ${g})`,
      poor: (g) => `Vent fort (ràfegues de fins a ${g})`,
      hazard: (g) => `Ràfegues perilloses de fins a ${g}`,
    },
    uv: {
      good: (uv) => `Índex UV ${uv}: fes servir protecció solar`,
      fair: (uv) => `UV alt (${uv}): protecció solar imprescindible`,
      poor: (uv) => `UV molt alt (${uv}): evita les hores centrals`,
      hazard: (uv) => `UV extrem (${uv})`,
    },
    storm: 'Tempestes elèctriques previstes',
    freezing: 'Pluja o plugim gelat',
    heavySnow: 'Nevades intenses',
    fog: 'Boira: visibilitat reduïda al camí',
    noTimeLeft: 'Avui ja no queden hores adequades: prova demà',
  },
  hourly: { title: 'Hora a hora', rain: 'Pluja', gusts: 'Ràfegues', feels: 'Sensació', empty: 'No hi ha hores disponibles per a aquest dia.' },
  levels: { good: 'Bo', fair: 'Regular', poor: 'Dolent', hazard: 'Perillós' },
  range: (s, e) => `Horari considerat: ${s}–${e}`,
  footer: {
    weather: 'Dades meteorològiques',
    geocoding: 'Geolocalització inversa',
    disclaimer: 'Recomanació orientativa basada en previsions; fes servir sempre el teu criteri.',
  },
};

const en: Messages = {
  langName: 'English',
  tagline: 'Is it a good time to train outdoors?',
  theme: { toDark: 'Switch to dark mode', toLight: 'Switch to light mode' },
  location: {
    label: 'Location',
    placeholder: 'Search for a city or place…',
    useMine: 'Use my location',
    locating: 'Getting your location…',
    searching: 'Searching…',
    noResults: 'No results',
    current: 'Current location',
    denied: 'Couldn’t get your location. Search for a city instead.',
    unsupported: 'Your browser doesn’t support geolocation. Search for a city instead.',
    searchError: 'Search failed. Please try again.',
    choose: 'Choose a location to see the recommendation.',
    change: 'Change',
  },
  activity: { running: 'Running', hiking: 'Hiking' },
  activityLabel: 'Activity',
  duration: {
    label: 'Duration',
    allDay: 'All day',
    hours: (h) => `${h} h`,
    minutes: (m) => `${m} min`,
  },
  day: { label: 'Day', today: 'Today', tomorrow: 'Tomorrow' },
  loading: 'Loading forecast…',
  loadError: 'Couldn’t load the forecast.',
  retry: 'Retry',
  verdict: {
    GO_NOW: { title: 'Go now', detail: 'Conditions are good right now.' },
    BEST_WINDOW: { title: 'Best time window', detail: 'This is the best slot of the day for your activity.' },
    LOW_PROB_WINDOW: {
      title: 'Low-probability window',
      detail: 'Conditions aren’t ideal: this is the safest slot, with the lowest risk of rain or bad weather.',
    },
    GYM: {
      title: 'Go to the gym',
      detail: 'No good outdoor window, but it’s fine to head out for an indoor workout.',
    },
    STAY_HOME: { title: 'Stay home', detail: 'Severe or hazardous conditions: better not to go out.' },
  },
  window: { label: 'Recommended window', now: 'Now' },
  betterLater: (s, e) => `Even better from ${s} to ${e}.`,
  confidence: {
    medium: 'Forecast several days out: it may change.',
    low: 'Long-range forecast: treat it as a rough guide.',
  },
  reasons: {
    rain: {
      good: ({ prob }) => (prob ? `Dry: rain chance at most ${prob}` : 'No rain expected'),
      fair: ({ prob, mm }) => `Chance of showers (up to ${prob ?? mm})`,
      poor: ({ prob, mm }) => `Rain likely (${prob ? `${prob}, ` : ''}up to ${mm})`,
      hazard: ({ mm }) => `Heavy rain (up to ${mm})`,
    },
    temp: {
      good: ({ range }) => `Pleasant: feels like ${range}`,
      cold: {
        fair: ({ range }) => `Cool: feels like ${range}`,
        poor: ({ range }) => `Very cold: feels like ${range}`,
        hazard: ({ min }) => `Extreme cold: feels like ${min}`,
      },
      hot: {
        fair: ({ range }) => `Warm: feels like ${range}`,
        poor: ({ range }) => `Very hot: feels like ${range}`,
        hazard: ({ max }) => `Extreme heat: feels like ${max}`,
      },
    },
    wind: {
      good: (g) => `Light wind (gusts up to ${g})`,
      fair: (g) => `Breezy (gusts up to ${g})`,
      poor: (g) => `Strong wind (gusts up to ${g})`,
      hazard: (g) => `Dangerous gusts up to ${g}`,
    },
    uv: {
      good: (uv) => `UV index ${uv}: wear sunscreen`,
      fair: (uv) => `High UV (${uv}): sunscreen essential`,
      poor: (uv) => `Very high UV (${uv}): avoid midday`,
      hazard: (uv) => `Extreme UV (${uv})`,
    },
    storm: 'Thunderstorms expected',
    freezing: 'Freezing rain or drizzle',
    heavySnow: 'Heavy snowfall',
    fog: 'Fog: reduced visibility on the trail',
    noTimeLeft: 'No suitable hours left today: try tomorrow',
  },
  hourly: { title: 'Hour by hour', rain: 'Rain', gusts: 'Gusts', feels: 'Feels', empty: 'No hours available for this day.' },
  levels: { good: 'Good', fair: 'Fair', poor: 'Poor', hazard: 'Hazardous' },
  range: (s, e) => `Hours considered: ${s}–${e}`,
  footer: {
    weather: 'Weather data',
    geocoding: 'Reverse geocoding',
    disclaimer: 'Forecast-based guidance only; always use your own judgement.',
  },
};

export const MESSAGES: Record<Lang, Messages> = { es, ca, en };

export function detectLang(): Lang {
  const candidates = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  for (const tag of candidates) {
    const base = tag.toLowerCase().split('-')[0];
    if ((LANGS as readonly string[]).includes(base ?? '')) return base as Lang;
  }
  return 'en';
}
