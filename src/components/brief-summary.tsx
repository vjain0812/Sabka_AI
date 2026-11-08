'use client';

import { Pencil } from 'lucide-react';
import { jobs, type BusinessBrief } from '@/lib/domain/brief';

export function BriefSummary({
  brief: b,
  onEdit,
}: {
  brief: BusinessBrief;
  onEdit?: (step: number) => void;
}) {
  const sections = [
    {
      title: 'Your business',
      step: 0,
      rows: [
        ['Name', b.profile.name || 'Not provided'],
        [
          'Business',
          b.profile.category === 'Other'
            ? b.profile.otherCategory
            : b.profile.category || 'Not selected',
        ],
        [
          'Role & team',
          `${b.profile.role} · ${
            b.profile.size === 'solo' ? 'Just me' : b.profile.size + ' people'
          }`,
        ],
        ['Location', b.profile.region || 'Not provided'],
      ],
    },
    {
      title: 'The work that matters',
      step: 1,
      rows: [
        ['First job', b.need.job ? jobs[b.need.job].title : 'Not selected'],
        ['The challenge', b.need.problem || 'Not provided'],
        ['Frequency & priority', `${b.need.frequency} · ${b.need.priority} priority`],
        ['A useful result', b.need.successMeasure || 'Not provided'],
      ],
    },
    {
      title: 'How you work today',
      step: 2,
      rows: [
        ['Channels', b.need.channels.join(', ') || 'Not provided'],
        ['Current tools', b.need.currentSystems.join(', ') || 'Not provided'],
        ['Subscriptions', b.need.subscriptions || 'Not provided'],
        ['Required connections', b.need.requiredIntegrations || 'None specified'],
        [
          'Manual handoff',
          b.need.manualHandoffAllowed ? 'Accepted, only if the route is verified' : 'Not accepted',
        ],
        [
          'Data sources',
          b.dataSources.length
            ? b.dataSources
                .map(
                  (s) =>
                    `${s.name} (${s.format}; permission ${s.permission.replaceAll(
                      '_',
                      ' ',
                    )}; completeness ${s.completeness}; sensitivity ${s.sensitivity})`,
                )
                .join(' · ')
            : 'Not provided — readiness will flag the gap',
        ],
      ],
    },
    {
      title: 'Your limits & human touch',
      step: 3,
      rows: [
        [
          'Monthly budget',
          b.need.monthlyBudgetUsd === null
            ? 'Not set'
            : `$${b.need.monthlyBudgetUsd} USD additional spend`,
        ],
        ['Setup time', b.need.setupMinutes === null ? 'Not set' : `${b.need.setupMinutes} minutes`],
        ['Comfort with technology', b.profile.technicalComfort],
        ['Tone', b.boundaries.tone || 'Not provided'],
        ['Customers value', b.boundaries.customerValues || 'Not provided'],
        [
          'Human-only actions',
          b.boundaries.mustStayHuman.join(', ') || 'Baseline human approval always applies',
        ],
        ['Known business facts', b.boundaries.businessFacts || 'Not provided'],
        ['Time back for', b.boundaries.timeSavedFor || 'Not provided'],
        ['Approval', 'A person approves all external actions'],
      ],
    },
  ];
  return (
    <div className="brief-summary">
      {sections.map((section) => (
        <section className="summary-section" key={section.title}>
          <div className="row-between">
            <h3>{section.title}</h3>
            {onEdit && (
              <button
                type="button"
                className="text-button"
                onClick={() => onEdit(section.step)}
                aria-label={`Edit ${section.title.toLowerCase()}`}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>
          <dl>
            {section.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
