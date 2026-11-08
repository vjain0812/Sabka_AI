import { currentPlanPrice, type CatalogRecord } from './catalog-record';
import { compactCount, toolInsights } from './tool-insights';
import { priceLabelEs } from './i18n-es';

export type HelpLanguage = 'en' | 'es';
export { reviewedClaim } from './tool-insights';

/** Short facts for cards. Vendor figures are labelled as the vendor's. */
export function toolFacts(
  record: CatalogRecord,
  locale: HelpLanguage,
  options: { now?: number; planId?: string | null } = {},
) {
  const now = options.now ?? Date.now();
  const t = (en: string, es: string) => (locale === 'es' ? es : en);
  const info = toolInsights(record, now);
  const plan =
    options.planId === undefined ? null : record.plans.find((p) => p.id === options.planId);
  const planPrice = plan ? currentPlanPrice(record, plan, now) : null;
  const cost =
    plan && planPrice !== null
      ? planPrice === 0
        ? t('Free plan', 'Plan gratuito')
        : `$${planPrice} / ${t('month', 'mes')}`
      : info.cheapest === null
      ? t('Needs checking', 'Por verificar')
      : locale === 'es'
      ? priceLabelEs(info.priceLabel)
      : info.priceLabel;
  return {
    cost,
    setup: info.setupQuote
      ? `${t('Vendor says', 'El proveedor dice')}: “${info.setupQuote}”`
      : `${locale === 'es' ? info.estimate.labelEs : info.estimate.label} (${t(
          'SABKA estimate',
          'estimación de SABKA',
        )})`,
    people: info.customerCount
      ? `${compactCount(info.customerCount)} ${t(
          'customers, per the vendor',
          'clientes, según el proveedor',
        )}`
      : t('Not published by the vendor', 'El proveedor no lo publica'),
    trial: info.trialDays
      ? `${info.trialDays}-${t('day free trial', 'días de prueba gratis')}`
      : null,
  };
}

type Answer = { text: string; sourceUrl: string | null };
/** Deterministic answers from the tool's sourced facts. No question leaves the browser here. */
export function answerToolQuestion(
  record: CatalogRecord,
  question: string,
  locale: HelpLanguage,
  planId?: string | null,
): Answer {
  const q = question.toLowerCase();
  const t = (en: string, es: string) => (locale === 'es' ? es : en);
  const info = toolInsights(record);
  const name = record.tool.name;
  const date = info.checkedAt ?? '';
  if (
    /cost|price|pricing|budget|plan|cheap|expens|costo|precio|presupuesto|cuesta|cuánto|cuanto/.test(
      q,
    )
  ) {
    if (planId) {
      const plan = record.plans.find((p) => p.id === planId);
      const price = plan ? currentPlanPrice(record, plan) : null;
      if (plan && price !== null && price > 0 && !info.prices.some((p) => p.price === price))
        info.prices.push({
          tier: plan.tier,
          price,
          billing: plan.billingBasis,
          quote: null,
          source: null,
        });
    }
    if (info.prices.length) {
      const list = info.prices
        .map(
          (p) =>
            `${p.tier}: ${p.price === 0 ? t('free', 'gratis') : `$${p.price}/${t('mo', 'mes')}`}`,
        )
        .join(' · ');
      const trial = info.trialDays
        ? ` ${t(
            `There's a ${info.trialDays}-day free trial.`,
            `Hay una prueba gratis de ${info.trialDays} días.`,
          )}`
        : '';
      return {
        text: `${t('Prices by plan', 'Precios por plan')}: ${list}.${trial} ${t(
          `From ${name}'s pricing page (checked ${date}). Taxes, extra users or add-ons can raise the total.`,
          `Según la página de precios de ${name} (revisada ${date}). Impuestos, usuarios o extras pueden subir el total.`,
        )}`,
        sourceUrl: info.pricingUrl,
      };
    }
    return {
      text: t(
        `${name} doesn't list plan prices publicly${
          info.trialDays ? `, but it offers a ${info.trialDays}-day free trial` : ''
        }. You'll need a quote from the vendor — we never assume unknown prices are free.`,
        `${name} no publica precios por plan${
          info.trialDays ? `, pero ofrece ${info.trialDays} días de prueba` : ''
        }. Necesitarás una cotización; nunca suponemos que un precio desconocido es gratis.`,
      ),
      sourceUrl: info.officialUrl,
    };
  }
  if (/trial|free|try|demo|prueba|gratis/.test(q)) {
    const parts = [
      info.freePlan
        ? t('It has a free plan.', 'Tiene un plan gratuito.')
        : t('No free plan is listed.', 'No hay plan gratuito publicado.'),
      info.trialDays
        ? t(
            `There's a ${info.trialDays}-day free trial.`,
            `Hay una prueba gratis de ${info.trialDays} días.`,
          )
        : t('No free trial is listed.', 'No hay prueba gratis publicada.'),
    ];
    return { text: parts.join(' '), sourceUrl: info.pricingUrl ?? info.officialUrl };
  }
  if (
    /setup|set up|easy|start|install|learn|hard|time|configur|fácil|facil|empez|instal|tiempo/.test(
      q,
    )
  ) {
    const vendor = info.setupQuote
      ? t(`${name} says: “${info.setupQuote}”. `, `${name} dice: “${info.setupQuote}”. `)
      : '';
    return {
      text: `${vendor}${t(
        `Our estimate for a tool like this: ${info.estimate.label.toLowerCase()}. Start with fictional sample data and keep your current process until it works.`,
        `Nuestra estimación para una herramienta así: ${info.estimate.labelEs.toLowerCase()}. Empieza con datos de ejemplo y conserva tu proceso actual hasta que funcione.`,
      )}`,
      sourceUrl: info.setupSource?.url ?? info.officialUrl,
    };
  }
  if (
    /people|helped|users|customers|popular|how many|who uses|invent|personas|ayudad|usuarios|clientes/.test(
      q,
    )
  ) {
    return info.customerQuote
      ? {
          text: t(
            `${name} says: “${info.customerQuote}”. That's the vendor's own figure, not a SABKA measurement — we do not invent success numbers.`,
            `${name} dice: “${info.customerQuote}”. Es la cifra del propio proveedor; no inventamos ni verificamos cifras de éxito.`,
          ),
          sourceUrl: info.customerSource?.url ?? null,
        }
      : {
          text: t(
            `${name} doesn't publish a customer count on its site, and we do not invent success numbers.`,
            `${name} no publica una cifra de clientes y no inventamos cifras de éxito.`,
          ),
          sourceUrl: info.officialUrl,
        };
  }
  if (/privacy|safe|secure|data|approval|send|privacidad|segur|datos|aproba|envi/.test(q))
    return {
      text: t(
        'Check every output yourself before it reaches a customer. Privacy, data retention and approval settings vary by plan — read the vendor’s privacy page before adding customer details.',
        'Revisa cada resultado antes de que llegue a un cliente. La privacidad y las aprobaciones varían por plan: lee la página de privacidad antes de agregar datos de clientes.',
      ),
      sourceUrl: info.officialUrl,
    };
  if (/alternative|instead|compare|vs|versus|similar|better|otra|alternativa|compar/.test(q))
    return {
      text: t(
        `Open ${name}'s tool page to compare it side by side with similar tools on price, free plans and setup.`,
        `Abre la página de ${name} para compararla con herramientas similares en precio, planes gratis y preparación.`,
      ),
      sourceUrl: null,
    };
  // Feature and "can I use it for…" questions: describe what the sources say it does.
  return {
    text: `${t('From its official page', 'Según su página oficial')}: ${info.capability} ${t(
      `It's mainly used for ${info.workflows
        .slice(0, 2)
        .join(' and ')
        .toLowerCase()}. If your task isn't described here, try it with sample data first.`,
      `Se usa sobre todo para ${info.workflows
        .slice(0, 2)
        .join(' y ')
        .toLowerCase()}. Si tu tarea no aparece aquí, pruébala primero con datos de ejemplo.`,
    )}`,
    sourceUrl: info.sources[0]?.url ?? null,
  };
}
