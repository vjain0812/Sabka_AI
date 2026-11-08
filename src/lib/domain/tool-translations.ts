import generated from './tool-summaries-es.json';

/** Short Spanish translations of the existing researched summaries; no new claims. */
const summaries: Record<string, string> = {
  grammarly: 'Asistencia de escritura para redactar y revisar correos a clientes.',
  'front-copilot':
    'Asistente de Front para preparar borradores de respuestas de atención al cliente.',
  'intercom-copilot':
    'Asistente que utiliza fuentes de conocimiento de Intercom para ayudar a responder a clientes.',
  'zendesk-copilot':
    'Asistencia para agentes de soporte, con funciones como sugerencias para los siguientes pasos.',
  'canva-magic-write': 'Primeros borradores e ideas de contenido con IA dentro de Canva.',
  'buffer-ai-assistant':
    'Ideas y borradores editables de textos para planear contenido en redes sociales.',
  jasper: 'Creación de contenido de marketing con información de marca y orientación de voz.',
  'hubspot-breeze-assistant':
    'Borradores y ajustes de contenido para redes sociales dentro de HubSpot Marketing Hub.',
  'reclaim-ai': 'Asistente de planificación de calendario con una etapa de revisión documentada.',
  motion: 'Organización de tareas y planificación automática del calendario con asistencia de IA.',
  'trevor-ai': 'Organización de tareas y bloques de tiempo con un asistente de IA.',
  'calendly-callie': 'Asistente de Calendly para coordinar citas por correo y preparar reuniones.',
};
export function spanishToolSummary(slug: string) {
  return (
    summaries[slug] ??
    (generated as Record<string, string>)[slug] ??
    (slug.startsWith('missive-')
      ? 'Bandeja de entrada compartida con borradores de respuestas por IA y distribución de mensajes. Faltan comprobaciones del costo y de los controles aplicables.'
      : null)
  );
}
