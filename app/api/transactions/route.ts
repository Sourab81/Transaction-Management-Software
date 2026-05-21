import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import { isRecord } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const pendingResponse = () => Response.json(
  { success: false, message: 'Backend endpoint is not configured for this module.' },
  { status: 501 },
);

const errorResponse = (error: unknown) => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      isRecord(error.body) || Array.isArray(error.body) || typeof error.body === 'string'
        ? error.body
        : { success: false, message: error.message },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json({ success: false, message: 'Unable to load transactions.' }, { status: 502 });
};

export async function GET() {
  const endpoint = process.env.NEXT_PUBLIC_API_TRANSACTIONS_PATH?.trim();
  if (!endpoint) {
    return pendingResponse();
  }

  try {
    // Token is httpOnly, so configured transaction backend calls run server-side.
    return Response.json(await backendFetch(endpoint));
  } catch (error) {
    return errorResponse(error);
  }
}
