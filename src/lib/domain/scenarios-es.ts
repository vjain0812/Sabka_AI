/** Spanish copy for the six workflows. Same claims as the English text; nothing added. */
export type ScenarioEs = {
  problem: string;
  pains: string[];
  successMeasure: string;
  roles: string[];
  steps: { title: string; detail: string }[];
  staysHuman: string[];
  existingOption: string;
};

export const scenariosEs: Record<string, ScenarioEs> = {
  'zumba-instructor': {
    problem:
      'Los alumnos olvidan las clases, cancelan a última hora o no se presentan. La instructora pierde tiempo coordinando reservas y recordatorios.',
    pains: [
      'Clases olvidadas',
      'Cancelaciones de último minuto',
      'Ausencias',
      'Recordatorios manuales',
    ],
    successMeasure: 'Menos ausencias y menos tiempo persiguiendo reservas cada semana.',
    roles: [
      'Reservas y gestión de clientes',
      'Programación de clases de fitness',
      'Redacción de recordatorios personalizados',
    ],
    steps: [
      {
        title: 'Los alumnos reservan su lugar en línea',
        detail: 'Un calendario con auto-reserva reemplaza el ir y venir por WhatsApp.',
      },
      {
        title: 'Los recordatorios salen antes de la clase',
        detail: 'Los recordatorios automáticos llegan a los alumnos antes de cada sesión.',
      },
      {
        title: 'La lista de espera llena los lugares cancelados',
        detail:
          'Una ventana de cancelación y una lista de espera evitan que las bajas tardías dejen huecos.',
      },
      {
        title: 'Recordatorios con tu estilo',
        detail: 'Prepara mensajes amables de recordatorio y seguimiento, y edítalos tú misma.',
      },
      {
        title: 'Tú pones las reglas',
        detail:
          'Las tarifas de cancelación, las excepciones y los alumnos frecuentes los decides tú.',
      },
    ],
    staysHuman: [
      'Tarifas de cancelación y excepciones',
      'Aprobar el texto de los recordatorios antes de enviarlos',
      'El trato personal con los alumnos frecuentes',
    ],
    existingOption:
      'Publica una lista semanal de clases en tu grupo de WhatsApp y envía un recordatorio la noche anterior. Lleva las inscripciones en una hoja de cálculo sencilla.',
  },
  'home-services': {
    problem:
      'Pierde llamadas de clientes mientras trabaja, olvida las direcciones y le cuesta programar citas.',
    pains: ['Llamadas perdidas durante el trabajo', 'Direcciones olvidadas', 'Visitas duplicadas'],
    successMeasure: 'Todos los que llaman reciben respuesta y cada visita tiene dirección y hora.',
    roles: [
      'Programación de servicios y automatización',
      'Comunicación con clientes y despacho asistidos por IA',
      'Recepcionista con IA',
    ],
    steps: [
      {
        title: 'Llamadas contestadas mientras trabajas',
        detail: 'Una recepcionista con IA contesta, toma la solicitud y filtra a quien llama.',
      },
      {
        title: 'Las solicitudes llegan a una sola lista de trabajos',
        detail:
          'Lo que no se puede agendar de inmediato llega como solicitud de trabajo para que la revises.',
      },
      {
        title: 'Visita, dirección y hora juntas',
        detail: 'Cada trabajo guarda en un solo lugar el cliente, la dirección y el horario.',
      },
      {
        title: 'Tú confirmas el trabajo',
        detail: 'Los presupuestos, los precios y cualquier caso inusual los confirmas tú.',
      },
    ],
    staysHuman: [
      'Dar precios y aprobar descuentos',
      'Confirmar trabajos urgentes o inusuales',
      'Lo que la recepcionista puede prometer a los clientes',
    ],
    existingOption:
      'Deja un saludo en el buzón de voz que pida nombre, dirección y el trabajo, y devuelve las llamadas desde una lista diaria en tu libreta o calendario.',
  },
  'leasing-agent': {
    problem:
      'Recibe consultas de alquiler repetitivas, pasa horas respondiendo preguntas y le cuesta dar seguimiento a los posibles inquilinos.',
    pains: ['Consultas repetitivas', 'Horas respondiendo preguntas', 'Seguimientos olvidados'],
    successMeasure: 'Cada posible inquilino recibe una respuesta a tiempo y un seguimiento.',
    roles: [
      'Conversaciones de alquiler',
      'Calificación de clientes potenciales y seguimiento',
      'Administración de propiedades y flujos con IA',
    ],
    steps: [
      {
        title: 'Las consultas reciben una primera respuesta',
        detail:
          'Las preguntas comunes sobre precio, disponibilidad y mascotas se responden por varios canales.',
      },
      {
        title: 'Se califican los interesados',
        detail: 'Un asistente conversacional hace las preguntas de calificación que tú elijas.',
      },
      {
        title: 'Se agendan las visitas',
        detail: 'Las visitas se reservan en el calendario de la propiedad.',
      },
      {
        title: 'Tú tomas la decisión del alquiler',
        detail: 'La evaluación, las aprobaciones y todo lo legalmente delicado siguen contigo.',
      },
    ],
    staysHuman: [
      'Evaluación y aprobación de inquilinos',
      'Respuestas sensibles en materia de vivienda justa',
      'Negociar la renta o las condiciones',
    ],
    existingOption:
      'Guarda respuestas listas para tus cinco preguntas más comunes y una columna de seguimiento en tu hoja de cálculo o CRM actual.',
  },
  laundromat: {
    problem:
      'Los clientes llaman una y otra vez para preguntar por la hora de recogida, las máquinas disponibles y el estado de su pedido, mientras el personal batalla para llevar el control de los pedidos.',
    pains: [
      'Llamadas de “¿ya está mi pedido?”',
      'Preguntas sobre la hora de recogida',
      'Pedidos sin seguimiento',
    ],
    successMeasure: 'Los clientes saben cuándo está listo su pedido sin tener que llamar.',
    roles: [
      'Operaciones y automatización de lavandería',
      'Punto de venta de lavandería y comunicación con clientes',
      'Atención al cliente con IA',
    ],
    steps: [
      {
        title: 'Cada pedido tiene seguimiento',
        detail: 'Los pedidos pasan por recepción, lavado, listo y entregado.',
      },
      {
        title: 'Los mensajes de estado salen solos',
        detail:
          'Los clientes reciben un mensaje de “listo para recoger” con el texto que tú defines.',
      },
      {
        title: 'Las preguntas comunes se responden en línea',
        detail:
          'El horario, los precios y la hora de recogida se responden con tus propias preguntas frecuentes.',
      },
      {
        title: 'El personal atiende las excepciones',
        detail: 'Las prendas dañadas, los reembolsos y las quejas pasan a una persona.',
      },
    ],
    staysHuman: [
      'Reembolsos, prendas dañadas y quejas',
      'Aprobar el texto de los mensajes automáticos',
      'Decisiones de mantenimiento de las máquinas',
    ],
    existingOption:
      'Escribe un número de ticket en cada pedido, mantén un tablero de “listo para recoger” y envía un mensaje de “listo” desde el teléfono del local.',
  },
  'home-baker': {
    problem:
      'Recibe pedidos por llamadas y WhatsApp, olvida las peticiones especiales y le intimida el software complicado.',
    pains: [
      'Pedidos dispersos entre llamadas y chats',
      'Peticiones especiales olvidadas',
      'El software parece difícil',
    ],
    successMeasure: 'Cada pedido, con su petición especial, anotado en un solo lugar sencillo.',
    roles: [
      'Organizar y redactar la información de los pedidos',
      'Gestión de pedidos de repostería',
      'Recepción de pedidos por conversación',
    ],
    steps: [
      {
        title: 'Los clientes piden en un chat amigable',
        detail: 'Un formulario conversacional pregunta fecha, sabor, tamaño y alergias.',
      },
      {
        title: 'Los pedidos se juntan en una lista',
        detail: 'Cada pedido, con su petición especial, llega a una lista sencilla.',
      },
      {
        title: 'Notas desordenadas, ordenadas',
        detail:
          'Pega un mensaje largo de WhatsApp y recibe un resumen limpio del pedido para revisar.',
      },
      {
        title: 'Tú confirmas cada pedido',
        detail: 'El precio, la hora de recogida y las notas de alergias los confirmas tú.',
      },
    ],
    staysHuman: [
      'Confirmar alergias y peticiones especiales',
      'Aceptar o rechazar pedidos',
      'Precios y horas de recogida',
    ],
    existingOption:
      'Usa un solo cuaderno de pedidos con una lista fija de preguntas (fecha, sabor, tamaño, alergias) y repite cada pedido al cliente.',
  },
  farmer: {
    problem:
      'Le cuesta decidir cuándo regar o detectar a tiempo los problemas del cultivo, con riesgo de perder cosecha y agua.',
    pains: ['Cuándo regar', 'Detectar tarde las enfermedades', 'Agua desperdiciada'],
    successMeasure:
      'Detectar a tiempo los problemas del cultivo y regar según lo que el campo necesita.',
    roles: [
      'Identificación de enfermedades de los cultivos',
      'Información sobre suelo y riego',
      'Monitoreo de campos por satélite',
    ],
    steps: [
      {
        title: 'Mira los campos desde arriba',
        detail: 'Los mapas satelitales de salud del cultivo resaltan las zonas con estrés.',
      },
      {
        title: 'Fotografía una planta enferma',
        detail:
          'Obtén un diagnóstico probable de plaga, enfermedad o falta de nutrientes a partir de una foto.',
      },
      {
        title: 'Lee el suelo',
        detail:
          'Los sensores de humedad convierten los datos del campo en recomendaciones de riego.',
      },
      {
        title: 'Recorres el campo y decides tú',
        detail:
          'Confirma los diagnósticos con un agrónomo o la oficina de extensión antes de tratar.',
      },
    ],
    staysHuman: [
      'Decisiones de tratamiento y fumigación',
      'Confirmar un diagnóstico con un experto local',
      'Cuándo regar y cuánto',
    ],
    existingOption:
      'Recorre la misma ruta de tus campos cada semana, anota los puntos con problemas en un cuaderno y consulta a tu oficina de extensión sobre cualquier cosa rara.',
  },
};
