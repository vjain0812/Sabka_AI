import { z } from 'zod';

/** Library relevance tags do not grant eligibility or establish a working integration. */
export const libraryWorkflows = {
  communications: 'Customer communication & support',
  marketing: 'Marketing & content planning',
  sales_crm: 'Sales & CRM',
  scheduling: 'Scheduling & appointments',
  projects_operations: 'Projects & business operations',
  documents_data: 'Documents & data extraction',
  finance_bookkeeping: 'Finance & bookkeeping',
  automation: 'Workflow automation',
  design_media: 'Design, video & audio',
  websites_commerce: 'Websites & e-commerce',
  research_knowledge: 'Research & business knowledge',
  meetings_notes: 'Meetings & transcription',
} as const;
export const businessTypes = {
  all_small_businesses: 'Cross-industry / any business type',
  professional_services: 'Professional & office services',
  retail_ecommerce: 'Retail, tailoring & e-commerce',
  food_hospitality: 'Food, bakeries & hospitality',
  home_field_services: 'Home, field & local services',
  health_wellness: 'Health, salons & wellness',
  education_creators: 'Education, instructors & creators',
  agriculture_manufacturing: 'Agriculture & manufacturing',
} as const;
export const libraryWorkflowSchema = z.enum(
  Object.keys(libraryWorkflows) as [
    keyof typeof libraryWorkflows,
    ...(keyof typeof libraryWorkflows)[],
  ],
);
export const businessTypeSchema = z.enum(
  Object.keys(businessTypes) as [keyof typeof businessTypes, ...(keyof typeof businessTypes)[]],
);
export type LibraryWorkflow = z.infer<typeof libraryWorkflowSchema>;
export type BusinessType = z.infer<typeof businessTypeSchema>;
export function workflowTags(tool: { libraryWorkflows?: LibraryWorkflow[]; jobs: string[] }) {
  if (tool.libraryWorkflows?.length) return tool.libraryWorkflows;
  const mapped: Record<string, LibraryWorkflow> = {
    customer_reply_drafting: 'communications',
    marketing_content: 'marketing',
    appointment_organization: 'scheduling',
  };
  return [...new Set(tool.jobs.flatMap((job) => (mapped[job] ? [mapped[job]] : [])))];
}
export function businessTags(tool: { businessTypes?: BusinessType[] }) {
  return tool.businessTypes?.length ? tool.businessTypes : ['all_small_businesses' as const];
}
