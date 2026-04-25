import { proxyAuthenticatedGetRequest, proxyAuthenticatedPostRequest } from '../../../lib/api/server-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return proxyAuthenticatedGetRequest('businesses', request);
}

export async function POST(request: Request) {
  return proxyAuthenticatedPostRequest('businessCreate', request);
}
