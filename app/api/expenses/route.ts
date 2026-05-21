export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    { success: false, message: 'Backend endpoint is not configured for this module.' },
    { status: 501 },
  );
}
