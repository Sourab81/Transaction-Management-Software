export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    { message: 'The services API route is reserved for a later integration slice.' },
    { status: 501 },
  );
}
