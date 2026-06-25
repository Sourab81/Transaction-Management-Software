import { backendFetch, BackendFetchError } from '../../../../lib/api/backendFetch';

export const dynamic = 'force-dynamic';

const DASHBOARD_STATS_ENDPOINT = 'userapi/dashboardStats';

export async function GET(request: Request) {
  console.info(`[dashboardStats] Local request URL: ${request.url}`);
  console.info(`[dashboardStats] Requesting backend endpoint: ${DASHBOARD_STATS_ENDPOINT}`);

  try {
    const payload = await backendFetch(DASHBOARD_STATS_ENDPOINT, { method: 'GET' });
    console.info('[dashboardStats] Backend response status: 200');

    return Response.json(payload);
  } catch (error) {
    const status = error instanceof BackendFetchError ? error.statusCode ?? 502 : 502;
    console.error(`[dashboardStats] Backend response status: ${status}`);

    return Response.json(
      { success: false, message: error instanceof BackendFetchError ? error.message : 'Unable to load dashboard stats.' },
      { status },
    );
  }
}
