import { backendFetch, BackendFetchError } from '../../../../lib/api/backendFetch';

export const dynamic = 'force-dynamic';

const errorResponse = (error: unknown) => Response.json(
  {
    success: false,
    message: error instanceof BackendFetchError
      ? error.message
      : 'Unable to load customer payments.',
  },
  { status: error instanceof BackendFetchError ? error.statusCode ?? 502 : 502 },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id')?.trim() || '';
  const requestedPage = Number(searchParams.get('page') || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedLimit = Number(searchParams.get('limit') || 10);
  const limit = [10, 20, 50, 100, 500].includes(requestedLimit) ? requestedLimit : 10;
  const fromDate = searchParams.get('from_date')?.trim() || '';
  const toDate = searchParams.get('to_date')?.trim() || '';

  if (!customerId) {
    return Response.json({ success: false, message: 'Customer id is required.' }, { status: 400 });
  }

  try {
    const backendParams = new URLSearchParams({
      customer_id: customerId,
      page: String(page),
      limit: String(limit),
    });
    if (fromDate) backendParams.set('from_date', fromDate);
    if (toDate) backendParams.set('to_date', toDate);

    return Response.json(await backendFetch(
      `userapi/customerPaymentList?${backendParams.toString()}`,
      { method: 'GET' },
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
