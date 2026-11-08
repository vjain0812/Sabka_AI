import { z } from 'zod';
import data from './tool-accessibility.json';

/**
 * Accessibility matching for the business owner (not their customers).
 * SABKA is a consultancy: we point owners to options and official guides; the companies listed
 * provide the products. Needs stay on the rules ranker and are never sent to an AI model.
 */
export const accessNeeds = [
  'new_to_tech',
  'low_vision',
  'blind',
  'deaf_hoh',
  'speech',
  'motor',
  'reading',
  'memory_focus',
] as const;
export const accessNeedSchema = z.enum(accessNeeds);
export type AccessNeed = z.infer<typeof accessNeedSchema>;

type Copy = { en: string; es: string };
export const needCopy: Record<AccessNeed, Copy & { hintEn: string; hintEs: string }> = {
  new_to_tech: {
    en: 'Technology feels new or hard for me',
    es: 'La tecnología me resulta nueva o difícil',
    hintEn: 'Common for older owners. We favour tools you can ask in everyday words.',
    hintEs:
      'Común en dueños mayores. Priorizamos herramientas a las que puedes preguntar con palabras sencillas.',
  },
  low_vision: {
    en: 'Small text is hard for me to read',
    es: 'Me cuesta leer letra pequeña',
    hintEn: 'Low vision or tired eyes.',
    hintEs: 'Baja visión o vista cansada.',
  },
  blind: {
    en: 'I’m blind or use a screen reader',
    es: 'Soy ciego/a o uso un lector de pantalla',
    hintEn: 'We check for published accessibility statements.',
    hintEs: 'Buscamos declaraciones de accesibilidad publicadas.',
  },
  deaf_hoh: {
    en: 'I’m deaf or hard of hearing',
    es: 'Soy sordo/a o tengo dificultad para oír',
    hintEn: 'Phone calls, meetings or videos are hard to follow.',
    hintEs: 'Las llamadas, reuniones o videos son difíciles de seguir.',
  },
  speech: {
    en: 'Speaking or phone calls are hard for me',
    es: 'Me cuesta hablar o atender llamadas',
    hintEn: 'You’d rather type or have calls handled.',
    hintEs: 'Prefieres escribir o que alguien atienda las llamadas.',
  },
  motor: {
    en: 'Typing or using a mouse is hard for me',
    es: 'Me cuesta escribir o usar el ratón',
    hintEn: 'Hands, arms, pain or tremor.',
    hintEs: 'Manos, brazos, dolor o temblor.',
  },
  reading: {
    en: 'Reading or writing long text is hard',
    es: 'Me cuesta leer o escribir textos largos',
    hintEn: 'For example dyslexia, or English isn’t your first language.',
    hintEs: 'Por ejemplo dislexia, o el inglés no es tu primer idioma.',
  },
  memory_focus: {
    en: 'Remembering things or staying focused is hard',
    es: 'Me cuesta recordar cosas o concentrarme',
    hintEn: 'For example ADHD, memory changes or brain fog.',
    hintEs: 'Por ejemplo TDAH, cambios de memoria o niebla mental.',
  },
};

export type AccessFeature = keyof typeof data.features | 'statement';
export const featureCopy: Record<AccessFeature, Copy> = {
  answers_calls: { en: 'Answers phone calls for you', es: 'Atiende llamadas por ti' },
  human_help: { en: 'Real people can take over', es: 'Personas reales pueden ayudarte' },
  speech_to_text: {
    en: 'Turns calls and meetings into text',
    es: 'Convierte llamadas y reuniones en texto',
  },
  captions: { en: 'Adds captions to videos', es: 'Añade subtítulos a los videos' },
  text_to_speech: { en: 'Reads text aloud to you', es: 'Te lee el texto en voz alta' },
  voice_for_you: { en: 'Turns typed text into a voice', es: 'Convierte texto escrito en voz' },
  writing_help: {
    en: 'Helps you write and check text',
    es: 'Te ayuda a escribir y revisar textos',
  },
  text_not_calls: {
    en: 'Uses texts or chat, so fewer calls',
    es: 'Usa mensajes o chat, con menos llamadas',
  },
  reminders_planning: {
    en: 'Plans your day and tracks tasks',
    es: 'Organiza tu día y tus tareas',
  },
  snap_documents: {
    en: 'Reads receipts and documents, so you type less',
    es: 'Lee recibos y documentos para que escribas menos',
  },
  plain_language: { en: 'Ask in everyday words', es: 'Pregunta con palabras sencillas' },
  statement: {
    en: 'Publishes an accessibility statement',
    es: 'Publica una declaración de accesibilidad',
  },
};
export type AccessCaution = 'technical_setup' | 'no_statement';
export const cautionCopy: Record<AccessCaution, Copy> = {
  technical_setup: {
    en: 'Setup is technical. Consider asking someone to help.',
    es: 'La configuración es técnica. Considera pedir ayuda.',
  },
  no_statement: {
    en: 'No accessibility statement found. Ask the vendor before paying.',
    es: 'No encontramos declaración de accesibilidad. Pregunta al proveedor antes de pagar.',
  },
};

/** Which tool features help each need. Order matters: earlier features are explained first. */
export const needFeatures: Record<AccessNeed, AccessFeature[]> = {
  new_to_tech: ['plain_language', 'human_help', 'writing_help', 'snap_documents'],
  low_vision: ['text_to_speech', 'statement'],
  blind: ['text_to_speech', 'statement'],
  deaf_hoh: ['answers_calls', 'text_not_calls', 'speech_to_text', 'captions'],
  speech: ['answers_calls', 'text_not_calls', 'voice_for_you'],
  motor: ['snap_documents', 'writing_help', 'statement'],
  reading: ['text_to_speech', 'writing_help', 'plain_language'],
  memory_focus: ['reminders_planning', 'speech_to_text', 'plain_language'],
};
/** Needs that depend on the app itself supporting assistive tech (screen readers, keyboard). */
const statementNeeds: AccessNeed[] = ['blind', 'motor'];

const featureIndex = new Map<string, Set<AccessFeature>>();
for (const [feature, slugs] of Object.entries(data.features))
  for (const slug of slugs)
    featureIndex.set(slug, (featureIndex.get(slug) ?? new Set()).add(feature as AccessFeature));
const statements = data.statements as Record<string, { url: string; quote: string }>;
const technical = new Set(data.technicalSetup);
export const ACCESSIBILITY_CHECKED_AT = data.checkedAt;

export function toolFeatures(slug: string): AccessFeature[] {
  const set = new Set(featureIndex.get(slug) ?? []);
  if (statements[slug]) set.add('statement');
  return [...set];
}
export function accessibilityStatement(slug: string) {
  return statements[slug] ?? null;
}

export type AccessFit = { helps: AccessFeature[]; cautions: AccessCaution[]; boost: number };
/** Score adjustment and plain explanations for one tool, given the owner's needs. */
export function accessFit(slug: string, needs: readonly AccessNeed[]): AccessFit {
  if (!needs.length) return { helps: [], cautions: [], boost: 0 };
  const has = new Set(toolFeatures(slug));
  const helps: AccessFeature[] = [];
  let needsHelped = 0;
  for (const need of needs) {
    const matched = needFeatures[need].filter((f) => has.has(f));
    if (matched.length) needsHelped++;
    for (const f of matched) if (!helps.includes(f)) helps.push(f);
  }
  // Practical features first; a published statement is supporting evidence.
  helps.sort((a, b) => Number(a === 'statement') - Number(b === 'statement'));
  const cautions: AccessCaution[] = [];
  let boost = Math.min(15, needsHelped * 7);
  if (needs.includes('new_to_tech') && technical.has(slug)) {
    cautions.push('technical_setup');
    boost -= 8;
  }
  if (needs.some((n) => statementNeeds.includes(n)) && !has.has('statement'))
    cautions.push('no_statement');
  return { helps, cautions, boost };
}

export type HelperCost = 'free_builtin' | 'free_app' | 'paid';
export type AccessHelper = {
  id: string;
  name: string;
  maker: string;
  cost: HelperCost;
  platforms: string;
  needs: AccessNeed[];
  en: string;
  es: string;
  /** Official page, checked 2026-11-08. */
  url: string;
};
/** Personal assistive tools, mostly free and already on the owner's phone or computer. */
export const accessHelpers: AccessHelper[] = [
  {
    id: 'voiceover',
    name: 'VoiceOver',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone, iPad, Mac',
    needs: ['blind', 'low_vision'],
    en: 'Speaks everything on the screen so you can use apps without seeing them.',
    es: 'Lee en voz alta todo lo que hay en la pantalla para usar apps sin verlas.',
    url: 'https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios',
  },
  {
    id: 'talkback',
    name: 'TalkBack',
    maker: 'Google',
    cost: 'free_builtin',
    platforms: 'Android',
    needs: ['blind', 'low_vision'],
    en: 'Speaks everything on the screen so you can use apps without seeing them.',
    es: 'Lee en voz alta todo lo que hay en la pantalla para usar apps sin verlas.',
    url: 'https://support.google.com/accessibility/android/answer/6283677',
  },
  {
    id: 'nvda',
    name: 'NVDA',
    maker: 'NV Access',
    cost: 'free_app',
    platforms: 'Windows',
    needs: ['blind'],
    en: 'A free screen reader for Windows computers.',
    es: 'Un lector de pantalla gratuito para computadoras con Windows.',
    url: 'https://www.nvaccess.org/',
  },
  {
    id: 'be-my-eyes',
    name: 'Be My Eyes',
    maker: 'Be My Eyes',
    cost: 'free_app',
    platforms: 'iPhone, Android',
    needs: ['blind', 'low_vision'],
    en: 'Volunteers or AI describe what your camera sees, like a label, letter or invoice.',
    es: 'Voluntarios o IA describen lo que ve tu cámara, como una etiqueta, carta o factura.',
    url: 'https://www.bemyeyes.com/',
  },
  {
    id: 'seeing-ai',
    name: 'Seeing AI',
    maker: 'Microsoft',
    cost: 'free_app',
    platforms: 'iPhone, Android',
    needs: ['blind', 'low_vision', 'reading'],
    en: 'Reads printed text and documents aloud and describes what the camera sees.',
    es: 'Lee en voz alta textos impresos y documentos, y describe lo que ve la cámara.',
    url: 'https://www.seeingai.com/',
  },
  {
    id: 'lookout',
    name: 'Lookout',
    maker: 'Google',
    cost: 'free_app',
    platforms: 'Android',
    needs: ['blind', 'low_vision'],
    en: 'Uses your camera to read text, labels and documents aloud.',
    es: 'Usa tu cámara para leer en voz alta textos, etiquetas y documentos.',
    url: 'https://play.google.com/store/apps/details?id=com.google.android.apps.accessibility.reveal',
  },
  {
    id: 'apple-zoom',
    name: 'Zoom & larger text',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone',
    needs: ['low_vision', 'new_to_tech'],
    en: 'Makes the whole screen and its text bigger.',
    es: 'Agranda toda la pantalla y su texto.',
    url: 'https://support.apple.com/guide/iphone/zoom-in-iph3e2e367e/ios',
  },
  {
    id: 'android-magnification',
    name: 'Magnification',
    maker: 'Google',
    cost: 'free_builtin',
    platforms: 'Android',
    needs: ['low_vision', 'new_to_tech'],
    en: 'Zooms in on any part of the screen.',
    es: 'Amplía cualquier parte de la pantalla.',
    url: 'https://support.google.com/accessibility/android/answer/6006949',
  },
  {
    id: 'apple-live-captions',
    name: 'Live Captions',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone, Mac',
    needs: ['deaf_hoh'],
    en: 'Shows live captions for spoken audio, such as calls and videos.',
    es: 'Muestra subtítulos en vivo del audio hablado, como llamadas y videos.',
    url: 'https://support.apple.com/guide/iphone/get-live-captions-of-spoken-audio-iphe0990f7bb/ios',
  },
  {
    id: 'android-live-caption',
    name: 'Live Caption',
    maker: 'Google',
    cost: 'free_builtin',
    platforms: 'Android',
    needs: ['deaf_hoh'],
    en: 'Captions videos and phone calls on your device.',
    es: 'Subtitula videos y llamadas en tu dispositivo.',
    url: 'https://support.google.com/accessibility/android/answer/9350862',
  },
  {
    id: 'live-transcribe',
    name: 'Live Transcribe & Sound Notifications',
    maker: 'Google',
    cost: 'free_app',
    platforms: 'Android',
    needs: ['deaf_hoh'],
    en: 'Turns speech around you into text and alerts you to sounds like a doorbell.',
    es: 'Convierte en texto lo que se habla a tu alrededor y te avisa de sonidos como el timbre.',
    url: 'https://play.google.com/store/apps/details?id=com.google.audio.hearing.visualization.accessibility.scribe',
  },
  {
    id: 'windows-live-captions',
    name: 'Live captions',
    maker: 'Microsoft',
    cost: 'free_builtin',
    platforms: 'Windows 11',
    needs: ['deaf_hoh'],
    en: 'Captions any audio on your computer, including online meetings.',
    es: 'Subtitula cualquier audio de tu computadora, incluidas reuniones en línea.',
    url: 'https://support.microsoft.com/en-us/accessibility/windows/use-live-captions-to-better-understand-audio',
  },
  {
    id: 'live-speech',
    name: 'Live Speech',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone, Mac',
    needs: ['speech'],
    en: 'Type what you want to say and your device speaks it, including during calls.',
    es: 'Escribe lo que quieres decir y tu dispositivo lo dice, también durante llamadas.',
    url: 'https://www.apple.com/accessibility/features/?speech',
  },
  {
    id: 'apple-dictation',
    name: 'Dictation',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone',
    needs: ['motor', 'new_to_tech', 'reading', 'low_vision'],
    en: 'Tap the microphone on the keyboard and speak instead of typing.',
    es: 'Toca el micrófono del teclado y habla en vez de escribir.',
    url: 'https://support.apple.com/guide/iphone/dictate-text-iph2c0651d2/ios',
  },
  {
    id: 'gboard-voice',
    name: 'Voice typing',
    maker: 'Google',
    cost: 'free_builtin',
    platforms: 'Android',
    needs: ['motor', 'new_to_tech', 'reading', 'low_vision'],
    en: 'Tap the microphone on the keyboard and speak instead of typing.',
    es: 'Toca el micrófono del teclado y habla en vez de escribir.',
    url: 'https://support.google.com/gboard/answer/2781851',
  },
  {
    id: 'apple-voice-control',
    name: 'Voice Control',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone, Mac',
    needs: ['motor'],
    en: 'Control your device and type using only your voice.',
    es: 'Controla tu dispositivo y escribe solo con la voz.',
    url: 'https://support.apple.com/guide/iphone/use-voice-control-iph2c21a3c88/ios',
  },
  {
    id: 'android-voice-access',
    name: 'Voice Access',
    maker: 'Google',
    cost: 'free_builtin',
    platforms: 'Android',
    needs: ['motor'],
    en: 'Control your phone using only your voice.',
    es: 'Controla tu teléfono solo con la voz.',
    url: 'https://support.google.com/accessibility/android/answer/6151848',
  },
  {
    id: 'windows-voice-access',
    name: 'Voice access',
    maker: 'Microsoft',
    cost: 'free_builtin',
    platforms: 'Windows 11',
    needs: ['motor'],
    en: 'Control your computer and dictate text using your voice.',
    es: 'Controla tu computadora y dicta texto con la voz.',
    url: 'https://support.microsoft.com/en-us/accessibility/windows/voice-access/get-started-with-voice-access',
  },
  {
    id: 'switch-control',
    name: 'Switch Control',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone',
    needs: ['motor'],
    en: 'Use your phone with an adaptive switch, head movements or other devices.',
    es: 'Usa tu teléfono con un interruptor adaptado, movimientos de cabeza u otros dispositivos.',
    url: 'https://support.apple.com/guide/iphone/set-up-and-turn-on-switch-control-iph400b2f114/ios',
  },
  {
    id: 'dragon',
    name: 'Dragon Professional',
    maker: 'Nuance (Microsoft)',
    cost: 'paid',
    platforms: 'Windows',
    needs: ['motor', 'reading'],
    en: 'Professional speech recognition for dictating documents and controlling your PC.',
    es: 'Reconocimiento de voz profesional para dictar documentos y controlar tu PC.',
    url: 'https://dragon.nuance.com/en-us/dragon-professional',
  },
  {
    id: 'speak-screen',
    name: 'Speak Screen',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone',
    needs: ['reading', 'low_vision'],
    en: 'Reads the screen or any text you select aloud.',
    es: 'Lee en voz alta la pantalla o el texto que selecciones.',
    url: 'https://support.apple.com/guide/iphone/hear-whats-on-the-screen-or-typed-iph96b214f0/ios',
  },
  {
    id: 'select-to-speak',
    name: 'Select to Speak',
    maker: 'Google',
    cost: 'free_builtin',
    platforms: 'Android',
    needs: ['reading', 'low_vision'],
    en: 'Tap any text on the screen to hear it read aloud.',
    es: 'Toca cualquier texto de la pantalla para escucharlo en voz alta.',
    url: 'https://support.google.com/accessibility/android/answer/7349565',
  },
  {
    id: 'assistive-access',
    name: 'Assistive Access',
    maker: 'Apple',
    cost: 'free_builtin',
    platforms: 'iPhone',
    needs: ['new_to_tech', 'memory_focus'],
    en: 'A simpler iPhone with big buttons and only the apps you choose.',
    es: 'Un iPhone más sencillo, con botones grandes y solo las apps que elijas.',
    url: 'https://support.apple.com/guide/assistive-access-iphone/welcome/ios',
  },
];
/** Catalog tools people use for themselves (not only for the business). */
export const catalogHelpers: { slug: string; needs: AccessNeed[] }[] = [
  { slug: 'speechify', needs: ['reading', 'low_vision', 'blind'] },
  { slug: 'otter-ai', needs: ['deaf_hoh', 'memory_focus'] },
  { slug: 'grammarly', needs: ['reading', 'motor', 'new_to_tech'] },
  { slug: 'chatgpt', needs: ['new_to_tech', 'reading', 'memory_focus'] },
  { slug: 'todoist', needs: ['memory_focus'] },
  { slug: 'krisp', needs: ['deaf_hoh'] },
  { slug: 'elevenlabs', needs: ['speech'] },
];

const costRank: Record<HelperCost, number> = { free_builtin: 0, free_app: 1, paid: 2 };
/**
 * Helpers grouped by need. Each helper appears once, under the first of its own needs (listed
 * best-fit first) that the owner chose, so groups stay short and don't repeat.
 */
export function helpersByNeed(needs: readonly AccessNeed[], perGroup = 6) {
  const home = (h: { needs: AccessNeed[] }) => h.needs.find((n) => needs.includes(n));
  return accessNeeds
    .filter((need) => needs.includes(need))
    .map((need) => ({
      need,
      helpers: accessHelpers
        .filter((h) => home(h) === need)
        .sort(
          (a, b) =>
            a.needs.indexOf(need) - b.needs.indexOf(need) || costRank[a.cost] - costRank[b.cost],
        )
        .slice(0, perGroup),
      catalog: catalogHelpers.filter((h) => home(h) === need).map((h) => h.slug),
    }))
    .filter((g) => g.helpers.length || g.catalog.length);
}
