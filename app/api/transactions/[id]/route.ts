import {
  backendFetch,
  BackendFetchError,
} from '../../../../lib/api/backendFetch';
import {
  isRecord,
  readJoinedMessage,
  readStringValue,
} from '../../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const readBackendMessage = (body: unknown, fallbackMessage: string) => {
  if (typeof body === 'string' && body.trim()) {
    const trimmedBody = body.trim();
    return /<!doctype html|<html|<body|<h1/i.test(trimmedBody)
      ? fallbackMessage
      : trimmedBody;
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

const errorResponse = (error: unknown) => {
  const fallbackMessage = 'Unable to load transaction details.';

  if (error instanceof BackendFetchError) {
    return Response.json(
      { success: false, message: readBackendMessage(error.body, error.message || fallbackMessage) },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json({ success: false, message: fallbackMessage }, { status: 502 });
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    return Response.json(await backendFetch(`transactions/${id}`, {
      method: 'GET',
    }));
  } catch (error) {
    if (error instanceof BackendFetchError && error.statusCode === 404) {
      try {
        const fallbackPayload = await backendFetch<unknown>('getTransactions', {
          method: 'POST',
          body: {
            include_children: 1,
            page_no: 1,
            limit: 100,
            status: 1,
          },
        });
        const fallbackRows = isRecord(fallbackPayload) && Array.isArray(fallbackPayload.data)
          ? fallbackPayload.data
          : [];
        const matchingTransaction = fallbackRows.find((row) => (
          isRecord(row)
          && readStringValue(row, ['transaction_id', 'transactionId', 'id']) === id
        ));

        return matchingTransaction
          ? Response.json(matchingTransaction)
          : errorResponse(error);
      } catch (fallbackError) {
        return errorResponse(fallbackError);
      }
    }

    return errorResponse(error);
  }
}
