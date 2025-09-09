export * as nws from './nws.js';
export * as metno from './metno.js';
export * as openmeteo from './openmeteo.js';
export * as openweather from './openweather.js';
export * as smhi from './smhi.js';

// Provider manifest and utilities
import providersManifestRaw from './providers.json';
import providersSchema from './providers.schema.json';

// Cast imported JSON to the stricter TypeScript types
export const providersManifest = providersManifestRaw as unknown as ProviderManifest;
export { providersSchema };

export interface Provider {
  id: string;
  name: string;
  category: string;
  access: 's3' | 'non_s3';
  s3?: {
    bucket: string;
    region: string;
    requesterPays: boolean | null;
    prefixExamples: string[] | null;
    snsTopic: string | null;
  } | null;
  wmts?: {
    baseUrl: string;
    layers: string[];
  } | null;
  rest?: {
    baseUrl: string;
    apiKeyRequired: boolean;
    userAgentRequired?: boolean;
    endpoints: string[];
  } | null;
  tiles?: {
    baseUrl: string;
    apiKeyRequired: boolean;
    tileFormat?: string;
    layers?: string[];
    attribution?: string;
    indexEndpoint?: string;
  } | null;
  auth: 'none' | 'api_key' | 'earthdata' | 'user_agent' | 'unknown';
  license: string;
  attribution: string;
  notes: string;
  costNote: 'same-region' | 'cross-region' | 'requester-pays' | 'external-service' | 'unknown-region';
  status?: 'active' | 'todo' | 'deprecated';
}

export interface ProviderManifest {
  providers: Provider[];
  meta: {
    version: string;
    updated: string;
    schema?: string;
    notes?: string;
  };
}

export const providers: Provider[] = providersManifest.providers as unknown as Provider[];

export function getProvider(id: string): Provider | undefined {
  return providers.find(p => p.id === id);
}

export function getProvidersByCategory(category: string): Provider[] {
  return providers.filter(p => p.category === category);
}

export function getProvidersByAccess(access: 's3' | 'non_s3'): Provider[] {
  return providers.filter(p => p.access === access);
}

export function getS3Providers(): Provider[] {
  return providers.filter(p => p.access === 's3' && p.s3);
}

export function getCrossRegionProviders(): Provider[] {
  return providers.filter(p => p.costNote === 'cross-region');
}

export function getRequesterPaysProviders(): Provider[] {
  return providers.filter(p => p.s3?.requesterPays === true);
}
