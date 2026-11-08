import type { BusinessType, LibraryWorkflow } from './library-taxonomy';

/**
 * Plain-language need detection. Pure TypeScript, deterministic and safe to run in the
 * browser: it powers live "we hear" chips and the server-side ranker. Patterns are matched
 * against the owner's own words; nothing here is sent anywhere.
 */
export type Intent = {
  id: string;
  label: string;
  patterns: RegExp[];
  workflows: LibraryWorkflow[];
  /** Extra search terms used to find tools that describe this need in other words. */
  expand: string[];
};

const w = (s: string) => new RegExp(`\\b(?:${s})`, 'i');

export const intents: Intent[] = [
  {
    id: 'missed_calls',
    label: 'Missed calls',
    patterns: [
      w(
        'miss(?:ed|ing)? calls?|phones?\\b|call(?:s|ing|ers?)?\\b|voicemail|receptionist|answer(?:ing)? (?:the )?(?:phone|calls)',
      ),
    ],
    workflows: ['communications', 'scheduling'],
    expand: ['call', 'phone', 'receptionist', 'answer', 'voice'],
  },
  {
    id: 'booking',
    label: 'Bookings & scheduling',
    patterns: [
      w(
        'book(?:ing|ings|s)?\\b|appointment|schedul|calendar|reservation|class(?:es)?\\b|slot|tour',
      ),
    ],
    workflows: ['scheduling'],
    expand: ['booking', 'appointment', 'schedule', 'calendar'],
  },
  {
    id: 'no_shows',
    label: 'No-shows & reminders',
    patterns: [
      w("no[- ]?shows?|don'?t show|forget|remind|cancel(?:s|led|lations?)?|last[- ]minute"),
    ],
    workflows: ['scheduling', 'communications'],
    expand: ['reminder', 'waitlist', 'cancellation'],
  },
  {
    id: 'customer_questions',
    label: 'Answering customer questions',
    patterns: [
      w(
        'questions?|inquir|enquir|faq|same thing|support|help ?desk|ask(?:s|ed|ing)?\\b|order status|is my|is (?:it|their|the order) ready',
      ),
    ],
    workflows: ['communications'],
    expand: ['support', 'chat', 'answer', 'help desk', 'inbox'],
  },
  {
    id: 'messaging',
    label: 'Chats & messages',
    patterns: [
      w(
        'whats ?app|messages?|messag|texts?\\b|sms|dms?\\b|instagram|facebook|messenger|inbox|emails?\\b',
      ),
    ],
    workflows: ['communications'],
    expand: ['message', 'inbox', 'whatsapp', 'chat'],
  },
  {
    id: 'follow_up',
    label: 'Leads & follow-up',
    patterns: [
      w(
        'follow[- ]?ups?|leads?\\b|prospect|quotes?\\b|estimate|clients? (?:go|went) cold|sales|pipeline|crm',
      ),
    ],
    workflows: ['sales_crm', 'communications'],
    expand: ['lead', 'crm', 'follow-up', 'sales'],
  },
  {
    id: 'marketing',
    label: 'Marketing & social posts',
    patterns: [
      w(
        'market|social|posts?\\b|content|promot|advert|ads?\\b|newsletter|campaign|followers|brand|seo|tiktok',
      ),
    ],
    workflows: ['marketing', 'design_media'],
    expand: ['social', 'marketing', 'content', 'email marketing'],
  },
  {
    id: 'reviews',
    label: 'Reviews & reputation',
    patterns: [w('reviews?\\b|reputation|ratings?|google business|testimonial|referr')],
    workflows: ['marketing', 'communications'],
    expand: ['review', 'reputation'],
  },
  {
    id: 'orders',
    label: 'Orders & pickups',
    patterns: [
      w(
        'orders?\\b|pick ?ups?|deliver|ready|special requests?|custom (?:cake|order)|takeout|online ordering',
      ),
    ],
    workflows: ['websites_commerce', 'projects_operations', 'communications'],
    expand: ['order', 'pickup', 'delivery', 'order tracking'],
  },
  {
    id: 'inventory',
    label: 'Stock & inventory',
    patterns: [w('inventory|stock|supplies|run(?:ning)? out|reorder|ingredients|food waste')],
    workflows: ['projects_operations'],
    expand: ['inventory', 'stock'],
  },
  {
    id: 'payments',
    label: 'Invoices & getting paid',
    patterns: [w('invoic|bill(?:s|ing)?\\b|get(?:ting)? paid|payments?|chase|overdue|deposits?')],
    workflows: ['finance_bookkeeping'],
    expand: ['invoice', 'payment', 'billing'],
  },
  {
    id: 'bookkeeping',
    label: 'Bookkeeping & receipts',
    patterns: [
      w('bookkeep|accounting|receipts?|expenses?|tax(?:es)?\\b|reconcil|payroll|cash ?flow'),
    ],
    workflows: ['finance_bookkeeping', 'documents_data'],
    expand: ['accounting', 'bookkeeping', 'receipt', 'expense'],
  },
  {
    id: 'paperwork',
    label: 'Forms & paperwork',
    patterns: [
      w(
        'paperwork|forms?\\b|pdfs?|documents?|contracts?|proposals?|sign(?:ature)?s?\\b|data entry|copy(?:ing)? .* into|spreadsheets?',
      ),
    ],
    workflows: ['documents_data', 'automation'],
    expand: ['form', 'document', 'pdf', 'contract', 'extract'],
  },
  {
    id: 'repetitive',
    label: 'Repetitive admin',
    patterns: [
      w(
        'repetit|manual|same (?:thing|email|message)|copy|admin|tedious|automat|every (?:day|week)|hours? (?:on|doing)',
      ),
    ],
    workflows: ['automation', 'projects_operations'],
    expand: ['automation', 'workflow', 'connect apps'],
  },
  {
    id: 'staff',
    label: 'Staff shifts & team',
    patterns: [
      w('staff|employees?|shifts?|rota|roster|team(?:mates)?\\b|hand-?offs?|time ?clock|timesheet'),
    ],
    workflows: ['scheduling', 'projects_operations'],
    expand: ['shift', 'employee', 'team', 'schedule'],
  },
  {
    id: 'jobs_dispatch',
    label: 'Jobs, quotes & dispatch',
    patterns: [
      w('jobs?\\b|dispatch|addresses?|site visits?|technician|crew|route|estimates?|work orders?'),
    ],
    workflows: ['scheduling', 'projects_operations'],
    expand: ['field service', 'job', 'dispatch', 'estimate'],
  },
  {
    id: 'website',
    label: 'Website & online store',
    patterns: [
      w('websites?|online (?:store|shop)|e-?commerce|shopify|landing page|domain|sell online'),
    ],
    workflows: ['websites_commerce'],
    expand: ['website', 'online store', 'ecommerce'],
  },
  {
    id: 'design_media',
    label: 'Photos, video & design',
    patterns: [
      w('photos?|pictures?|images?|videos?|reels?|logo|flyer|poster|design|graphics?|menu design'),
    ],
    workflows: ['design_media'],
    expand: ['design', 'video', 'photo', 'image'],
  },
  {
    id: 'meetings',
    label: 'Meetings & notes',
    patterns: [w('meetings?|notes?\\b|minutes|transcri|record(?:ing)? calls|zoom|summar')],
    workflows: ['meetings_notes'],
    expand: ['meeting', 'notes', 'transcription'],
  },
  {
    id: 'knowledge',
    label: 'Research & answers',
    patterns: [
      w(
        'research|find out|learn|understand|ideas?|brainstorm|plan(?:ning)?\\b|strategy|write|writing|draft',
      ),
    ],
    workflows: ['research_knowledge', 'documents_data'],
    expand: ['assistant', 'research', 'writing'],
  },
  {
    id: 'translation',
    label: 'Other languages',
    patterns: [w('translat|spanish|languages?|bilingual|english is')],
    workflows: ['communications', 'documents_data'],
    expand: ['translation', 'language'],
  },
  {
    id: 'crops',
    label: 'Crops, soil & irrigation',
    patterns: [
      w(
        'crops?|irrigat|soil|fields?\\b|harvest|yield|pests?|plant disease|farm|livestock|cattle|weeds?|water(?:ing)?',
      ),
    ],
    workflows: ['research_knowledge', 'projects_operations'],
    expand: ['crop', 'field', 'farm', 'soil', 'irrigation'],
  },
  {
    id: 'property',
    label: 'Rentals & tenants',
    patterns: [
      w('tenants?|rentals?|leas(?:e|ing)|landlord|propert(?:y|ies)|apartments?|showings?'),
    ],
    workflows: ['communications', 'sales_crm', 'projects_operations'],
    expand: ['property', 'leasing', 'rent', 'tenant'],
  },
  {
    id: 'courses',
    label: 'Courses & students',
    patterns: [w('courses?|students?|lessons?|teach|coaching|workshops?|members(?:hip)?')],
    workflows: ['websites_commerce', 'scheduling'],
    expand: ['course', 'student', 'membership'],
  },
];

export type DetectedIntent = { id: string; label: string; workflows: LibraryWorkflow[] };

/** Spanish stems per need (prefix matches, so inflections are covered). */
const spanishStems: Record<string, string> = {
  missed_calls: 'llamad|llaman|llamar|teléfono|telefono|contest|buzón|buzon|recepcion',
  booking: 'reserv|cita\\b|citas|agend|calendario|horario|clase|turno|visita',
  no_shows: 'no (?:se )?presenta|ausenc|olvid|recordator|cancel|última hora|ultima hora',
  customer_questions:
    'pregunt|consult|duda|mismas? (?:cosas?|preguntas?)|atención al cliente|soporte|estado del pedido|está listo|esta listo',
  messaging: 'whats ?app|mensaj|texto|sms|instagram|facebook|correo|email|bandeja',
  follow_up:
    'seguimiento|cliente potencial|clientes potenciales|prospecto|presupuesto|cotiz|ventas|crm',
  marketing:
    'market|redes sociales|publicac|contenido|promocion|promoción|anunci|boletín|boletin|campaña|seguidores|marca',
  reviews: 'reseña|reputaci|calificaci|opinion|opinión|referid',
  orders: 'pedido|recoger|recogida|entrega|reparto|a domicilio|petición|peticion|encargo',
  inventory: 'inventario|existencias|stock|insumos|ingredientes|se acaba|reabastec|desperdicio',
  payments: 'factur|cobr|pagos?\\b|deposit|depósit|atrasad|vencid',
  bookkeeping: 'contabilidad|recibos?|gastos|impuestos|conciliar|nómina|nomina|flujo de caja',
  paperwork:
    'papeleo|formulario|pdf|document|contrato|propuesta|firma|hoja de cálculo|hoja de calculo|capturar datos',
  repetitive: 'repetitiv|manual|tedios|automatiz|administrativ|cada día|cada dia|cada semana|horas',
  staff: 'personal|empleado|turnos|equipo|nómina|horas de trabajo|control de horario',
  jobs_dispatch:
    'trabajo|despacho|direcci|visitas? a|técnico|tecnico|cuadrilla|ruta|presupuest|órdenes? de trabajo',
  website:
    'sitio web|página web|pagina web|tienda en línea|tienda en linea|comercio electr|shopify|vender en línea|vender en linea',
  design_media:
    'foto|imagen|imágenes|imagenes|video|reel|logo|volante|cartel|diseñ|gráfic|grafic|menú|menu',
  meetings: 'reuni|notas|actas|transcri|grabar|zoom|resumir|resumen',
  knowledge:
    'investig|aprender|entender|ideas?\\b|lluvia de ideas|planific|estrategia|escribir|redactar|borrador',
  translation: 'traduc|idiomas?|bilingü|bilingu|inglés|ingles',
  crops:
    'cultivo|riego|regar|suelo|campo|cosecha|rendimiento|plaga|enfermedad de|granja|ganado|maleza|agua',
  property: 'inquilino|alquiler|arrend|propiedad|apartamento|departamento|casero|visitas de',
  courses:
    'curso|alumno|estudiante|lección|leccion|clases? (?:en línea|en linea)|taller|membres|entrenamiento',
};

export function detectIntents(text: string, limit = 5): DetectedIntent[] {
  const clean = text.toLowerCase().slice(0, 1200);
  if (clean.trim().length < 3) return [];
  const scored = intents
    .map((intent, order) => {
      const es = spanishStems[intent.id];
      const hits =
        intent.patterns.reduce(
          (sum, p) => sum + (clean.match(new RegExp(p.source, 'gi'))?.length ?? 0),
          0,
        ) + (es ? clean.match(new RegExp(`(?:^|[^a-záéíóúñ])(?:${es})`, 'gi'))?.length ?? 0 : 0);
      return { intent, hits, order };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.order - b.order);
  return scored
    .slice(0, limit)
    .map(({ intent }) => ({ id: intent.id, label: intent.label, workflows: intent.workflows }));
}

export function intentById(id: string) {
  return intents.find((i) => i.id === id) ?? null;
}

/** Business category from the brief → library business-type tag. */
export const categoryBusinessType: Record<string, BusinessType | null> = {
  'Home bakery': 'food_hospitality',
  'Café or restaurant': 'food_hospitality',
  'HVAC or home services': 'home_field_services',
  Landscaping: 'home_field_services',
  'Salon or wellness': 'health_wellness',
  Retail: 'retail_ecommerce',
  Laundromat: 'home_field_services',
  Farming: 'agriculture_manufacturing',
  Tailoring: 'retail_ecommerce',
  'Instructor or creator': 'education_creators',
  'Professional services': 'professional_services',
  Other: null,
  '': null,
};

/** Words that signal a tool is made for this specific trade (matched against sourced text). */
export const categoryKeywords: Record<string, string[]> = {
  'Home bakery': ['bakery', 'baker', 'cake', 'pastry'],
  'Café or restaurant': ['restaurant', 'cafe', 'café', 'menu', 'reservation', 'hospitality'],
  'HVAC or home services': [
    'hvac',
    'plumb',
    'electric',
    'contractor',
    'field service',
    'home service',
    'trade',
  ],
  Landscaping: ['landscap', 'lawn', 'field service', 'home service', 'route'],
  'Salon or wellness': ['salon', 'spa', 'beauty', 'barber', 'wellness'],
  Retail: ['retail', 'store', 'shop', 'ecommerce', 'point of sale', 'inventory'],
  Laundromat: ['laundry', 'laundromat', 'dry clean', 'dry-clean', 'garment'],
  Farming: ['farm', 'crop', 'agronom', 'livestock', 'irrigation', 'soil'],
  Tailoring: ['tailor', 'alteration', 'garment', 'retail'],
  'Instructor or creator': [
    'class',
    'studio',
    'fitness',
    'course',
    'creator',
    'student',
    'instructor',
  ],
  'Professional services': ['client', 'firm', 'agency', 'professional', 'practice'],
};
