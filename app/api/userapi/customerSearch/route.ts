import { backendFetch, BackendFetchError } from '../../../../lib/api/backendFetch';

export const dynamic = 'force-dynamic';

const errorResponse = (error: unknown) => Response.json(
  {
    success: false,
    message: error instanceof BackendFetchError
      ? error.message
      : 'Unable to search customers.',
  },
  { status: error instanceof BackendFetchError ? error.statusCode ?? 502 : 502 },
);

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || '';

  if (query.length < 2) {
    return Response.json({ success: true, data: [] });
  }

  try {
    return Response.json(await backendFetch(`userapi/customerSearch?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
