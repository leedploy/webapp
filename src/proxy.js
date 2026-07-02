import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const authSession = request.cookies.get('auth_session')?.value;

  // เส้นทางสาธารณะที่ไม่ต้องล็อกอิน
  const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth');

  // ไฟล์และ asset ต่างๆ ที่ต้องข้ามการตรวจสิทธิ์
  const isAssetPath = pathname.startsWith('/_next') || 
                      pathname.includes('.') || 
                      pathname.startsWith('/static');

  if (isAssetPath) {
    return NextResponse.next();
  }

  // ตรวจสอบสถานะการล็อกอินเบื้องต้นด้วยคุกกี้เซสชัน
  const isAuthenticated = !!authSession;

  if (!isAuthenticated && !isPublicPath) {
    // ถ้าเรียก API โดยตรง ให้ส่ง 401
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Please login.' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    // ถ้าเข้าหน้าเว็บทั่วไป ให้เด้งไปหน้า login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ถ้าล็อกอินแล้วและจะไปหน้า /login ให้เด้งกลับหน้าหลัก
  if (isAuthenticated && pathname === '/login') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * ตรวจจับทุกเส้นทางยกเว้น:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
