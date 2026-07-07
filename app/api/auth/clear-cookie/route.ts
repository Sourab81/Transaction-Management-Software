import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ status: true, message: 'Cookie cleared.' });

  response.cookies.set('enest-auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
