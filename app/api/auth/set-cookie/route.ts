import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { token?: string };

  try {
    body = await request.json() as { token?: string };
  } catch {
    return NextResponse.json({ status: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const token = body?.token?.trim();

  if (!token) {
    return NextResponse.json({ status: false, message: 'Token is required.' }, { status: 400 });
  }

  const response = NextResponse.json({ status: true, message: 'Cookie set.' });

  response.cookies.set('enest-auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 86400,
  });

  return response;
}
