import { proxyAuthenticatedGetRequest } from '../../../lib/api/server-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return proxyAuthenticatedGetRequest('dashboardSummary', request);
}

