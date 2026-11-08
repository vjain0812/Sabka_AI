import { businessTypes } from './library-taxonomy';

export const workflowEs: Record<string, string> = {
  communications: 'Comunicación y atención al cliente',
  marketing: 'Marketing y planificación de contenido',
  sales_crm: 'Ventas y CRM',
  scheduling: 'Citas y programación',
  projects_operations: 'Proyectos y operaciones',
  documents_data: 'Documentos y extracción de datos',
  finance_bookkeeping: 'Finanzas y contabilidad',
  automation: 'Automatización de flujos',
  design_media: 'Diseño, video y audio',
  websites_commerce: 'Sitios web y comercio electrónico',
  research_knowledge: 'Investigación y conocimiento del negocio',
  meetings_notes: 'Reuniones y transcripción',
};

/** Spanish for the strings the ranking engine produces. Pure functions, no network. */
export const needLabelEs: Record<string, string> = {
  'Missed calls': 'Llamadas perdidas',
  'Bookings & scheduling': 'Reservas y citas',
  'No-shows & reminders': 'Ausencias y recordatorios',
  'Answering customer questions': 'Responder preguntas de clientes',
  'Chats & messages': 'Chats y mensajes',
  'Leads & follow-up': 'Clientes potenciales y seguimiento',
  'Marketing & social posts': 'Marketing y publicaciones',
  'Reviews & reputation': 'Reseñas y reputación',
  'Orders & pickups': 'Pedidos y recogidas',
  'Stock & inventory': 'Inventario',
  'Invoices & getting paid': 'Facturas y cobros',
  'Bookkeeping & receipts': 'Contabilidad y recibos',
  'Forms & paperwork': 'Formularios y papeleo',
  'Repetitive admin': 'Tareas administrativas repetitivas',
  'Staff shifts & team': 'Turnos y equipo',
  'Jobs, quotes & dispatch': 'Trabajos, presupuestos y despacho',
  'Website & online store': 'Sitio web y tienda en línea',
  'Photos, video & design': 'Fotos, video y diseño',
  'Meetings & notes': 'Reuniones y notas',
  'Research & answers': 'Investigación y respuestas',
  'Other languages': 'Otros idiomas',
  'Crops, soil & irrigation': 'Cultivos, suelo y riego',
  'Rentals & tenants': 'Alquileres e inquilinos',
  'Courses & students': 'Cursos y estudiantes',
};
export const categoryEs: Record<string, string> = {
  'Home bakery': 'panadería casera',
  'Café or restaurant': 'cafetería o restaurante',
  'HVAC or home services': 'servicios del hogar',
  Landscaping: 'jardinería',
  'Salon or wellness': 'salón o bienestar',
  Retail: 'comercio',
  Laundromat: 'lavandería',
  Farming: 'agricultura',
  Tailoring: 'sastrería',
  'Instructor or creator': 'instructores y creadores',
  'Professional services': 'servicios profesionales',
  Other: 'otros negocios',
};
export const businessTypeEs: Record<string, string> = {
  all_small_businesses: 'cualquier pequeño negocio',
  professional_services: 'servicios profesionales',
  retail_ecommerce: 'comercio y tiendas en línea',
  food_hospitality: 'comida y hospitalidad',
  home_field_services: 'servicios del hogar y en campo',
  health_wellness: 'salud y bienestar',
  education_creators: 'educación y creadores',
  agriculture_manufacturing: 'agricultura y manufactura',
};
const channelEs: Record<string, string> = {
  whatsapp: 'whatsapp',
  phone: 'teléfono',
  email: 'correo',
  'social media': 'redes sociales',
  website: 'sitio web',
  'walk-in': 'visitas en persona',
};
const needEs = (label: string) => (needLabelEs[label] ?? label).toLowerCase();

/** Translate one English reason chip produced by the ranker. */
export function reasonEs(reason: string) {
  if (reason === 'You already use this') return 'Ya la usas';
  if (reason === 'From a vendor you already use') return 'De un proveedor que ya usas';
  if (reason === 'Free plan') return 'Plan gratuito';
  if (reason === 'Price not verified yet') return 'Precio sin verificar';
  let m = reason.match(/^From \$([\d.,]+)\/mo · fits budget$/);
  if (m) return `Desde $${m[1]}/mes · cabe en tu presupuesto`;
  m = reason.match(/^Handles (.+)$/);
  if (m) {
    const label = Object.keys(needLabelEs).find((k) => k.toLowerCase() === m![1]);
    return `Resuelve: ${label ? needEs(label) : m[1]}`;
  }
  m = reason.match(/^Made for (.+)$/);
  if (m) {
    const key = Object.keys(categoryEs).find((k) => k.toLowerCase() === m![1]);
    return `Hecha para ${key ? categoryEs[key] : m[1]}`;
  }
  m = reason.match(/^Built for (.+)$/);
  if (m) {
    const key = Object.entries(businessTypes).find(([, v]) => v.toLowerCase() === m![1]);
    return `Pensada para ${key ? businessTypeEs[key[0]] : m[1]}`;
  }
  m = reason.match(/^Works with (.+)$/);
  if (m) return `Funciona con ${channelEs[m[1]] ?? m[1]}`;
  return reason;
}
/** "Covers a and b for c." from the rules ranker. */
export function whyEs(why: string, summaryEs: string | null) {
  const m = why.match(/^Covers (.+?)(?: for (.+))?\.$/);
  if (!m) return summaryEs ?? why;
  const needs = m[1].split(' and ').map((n) => {
    const label = Object.keys(needLabelEs).find((k) => k.toLowerCase() === n);
    return label ? needEs(label) : n;
  });
  let tail = '';
  if (m[2]) {
    const cat = Object.keys(categoryEs).find((k) => k.toLowerCase() === m[2]);
    const bt = Object.entries(businessTypes).find(([, v]) => v.toLowerCase() === m[2]);
    tail = ` para ${cat ? categoryEs[cat] : bt ? businessTypeEs[bt[0]] : m[2]}`;
  }
  return `Cubre ${needs.join(' y ')}${tail}.`;
}
export function priceLabelEs(label: string) {
  if (label === 'Price needs verification') return 'Precio por verificar';
  if (label === 'Free plan') return 'Plan gratuito';
  let m = label.match(/^Free plan · paid from \$([\d.,]+)\/mo$/);
  if (m) return `Plan gratuito · de pago desde $${m[1]}/mes`;
  m = label.match(/^From \$([\d.,]+)\/mo$/);
  if (m) return `Desde $${m[1]}/mes`;
  return label;
}
export function setAsideReasonEs(reason: string) {
  const m = reason.match(/^Cheapest plan \(\$([\d.,]+)\/mo\) is above your \$([\d.,]+) budget$/);
  if (m) return `El plan más barato ($${m[1]}/mes) supera tu presupuesto de $${m[2]}`;
  if (reason === 'You said this didn’t work for you') return 'Dijiste que no te funcionó';
  if (reason === 'Documented setup time is longer than you have')
    return 'El tiempo de preparación documentado supera el que tienes';
  return reason;
}

export const jobEs: Record<string, string> = {
  customer_reply_drafting: 'Respuestas y seguimiento a clientes',
  marketing_content: 'Marketing y planificación de contenido',
  appointment_organization: 'Citas y solicitudes',
};

/** Spanish names for the business-type picker (same order as `categories`). */
export const categoryNameEs: Record<string, string> = {
  'Home bakery': 'Panadería casera',
  'Café or restaurant': 'Cafetería o restaurante',
  'HVAC or home services': 'Climatización o servicios del hogar',
  Landscaping: 'Jardinería',
  'Salon or wellness': 'Salón o bienestar',
  Retail: 'Comercio',
  Laundromat: 'Lavandería',
  Farming: 'Agricultura',
  Tailoring: 'Sastrería',
  'Instructor or creator': 'Instructor o creador',
  'Professional services': 'Servicios profesionales',
  Other: 'Otro',
};
