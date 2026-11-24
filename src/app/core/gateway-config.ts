interface GatewayConfig {
  gatewayApiBaseUrl: string;
  designerStudioUrl: string;
  blobUrl: string;
}

let gatewayApiBaseUrl: string | undefined;
let designerStudioUrl: string | undefined;
let blobServiceUrl: string | undefined;

export async function loadGatewayConfig(): Promise<void> {
  const response = await fetch(new URL('config/gateway.json', document.baseURI), { cache: 'no-store' });

  if (!response.ok) throw new Error(`Gateway configuration could not be loaded (${response.status}).`);

  const config = await response.json() as GatewayConfig;
  const url = new URL(config.gatewayApiBaseUrl, document.baseURI);
  const studioUrl = new URL(config.designerStudioUrl, url);
  const blobUrl = new URL(config.blobUrl, url);

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error('gatewayApiBaseUrl must be an HTTP(S) gateway URL without credentials, query, or fragment.');
  
  if (!['http:', 'https:'].includes(studioUrl.protocol) || studioUrl.username || studioUrl.password || studioUrl.search || studioUrl.hash)
    throw new Error('designerStudioUrl must be an HTTP(S) URL without credentials, query, or fragment.');

  gatewayApiBaseUrl = url.href.replace(/\/+$/, '');
  designerStudioUrl = studioUrl.href.replace(/\/+$/, '');
  blobServiceUrl = blobUrl.href.replace(/\/+$/, '');

}

export function getGatewayApiBaseUrl(): string {
  if (!gatewayApiBaseUrl) throw new Error('Gateway configuration has not been loaded.');
  return gatewayApiBaseUrl;
}

export function getDesignerStudioUrl(): string {
  if (!designerStudioUrl) throw new Error('Gateway configuration has not been loaded.');
  return designerStudioUrl;
}

export function getBlobServiceUrl(): string {
  if (!blobServiceUrl) throw new Error('Gateway configuration has not been loaded.');
  return blobServiceUrl;
}

