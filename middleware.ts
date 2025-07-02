import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isAdminRole, UserRoleType } from '@interfaces/roles'

// Define the type for user metadata
type UserMetadata = {
  role?: UserRoleType;
  source?: string;
}

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)',
  '/api/v1/feature-flags(.*)',
  '/api/v1/alert-banner(.*)',
  '/api/v1/featured-events(.*)',
  '/api/v1/video-settings/current(.*)',
  '/api/v1/google-reviews(.*)',
  '/api/v1/category(.*)',
  '/api/v1/search(.*)',
  '/api/v1/product(.*)',
  '/api/v1/search-square-customer(.*)',
  '/api/v1/create-square-customer(.*)',
  '/api/v1/update-square-customer(.*)',
  '/api/v1/print-jobs(.*)',
  '/api/v1/installers(.*)',
  '/api/v1/cart(.*)',
  '/api/v1/checkout/merchant-settings(.*)',
  '/api/v1/checkout/process-payment(.*)',
  '/api/v1/user/metadata(.*)',
  '/',         
  '/events(.*)', 
  '/category(.*)',
  '/search(.*)', 
  '/product(.*)',
  '/cart(.*)',
  '/checkout(.*)',
  '/maintenance(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Get session claims
  const { sessionClaims } = await auth()
  const metadata = sessionClaims?.metadata as UserMetadata | undefined
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  const isAdmin = metadata?.role ? isAdminRole(metadata.role) : false
  const isPrintAgent = metadata?.source === 'print-agent'
  const isMaintenancePage = req.nextUrl.pathname.startsWith('/maintenance')
  
  // Check if request is from Electron app
  const electronHeader = req.headers.get('x-electron-app')
  const referer = req.headers.get('referer')
  const userAgent = req.headers.get('user-agent') || ''
  const isElectron = electronHeader === 'true' || 
                    (referer && referer.includes('electron-app')) ||
                    userAgent.includes('mav-print') ||
                    userAgent.includes('Electron')
  const isPrintAgentRoute = req.nextUrl.pathname.startsWith('/print-agent')
  const isHomePage = req.nextUrl.pathname === '/'
  const isLoginPage = req.nextUrl.pathname === '/print-agent/login'
  const isApiRequest = req.nextUrl.pathname.startsWith('/api/')
  const isPublicRouteMatch = isPublicRoute(req)


  // Handle Electron app requests first
  if (isElectron) {
    console.log('=== Electron App Request Handling ===')
    
    // Allow all API requests from Electron apps
    if (isApiRequest) {
      console.log('Electron: Allowing API request')
      return NextResponse.next()
    }

    // If on login page and not logged in, allow access
    if (isLoginPage && !sessionClaims) {
      console.log('Electron: Allowing access to login page')
      return NextResponse.next()
    }

    // If not logged in, always redirect to login page
    if (!sessionClaims) {
      console.log('Electron: Not logged in, redirecting to login')
      return NextResponse.redirect(new URL('/print-agent/login', req.url))
    }

    // If logged in but not a print agent, redirect to login
    if (!isPrintAgent) {
      console.log('Electron: Not a print agent, redirecting to login')
      return NextResponse.redirect(new URL('/print-agent/login', req.url))
    }

    // If on home page, redirect to print-agent
    if (isHomePage) {
      console.log('Electron: On home page, redirecting to print-agent')
      return NextResponse.redirect(new URL('/print-agent', req.url))
    }

    // If on print-agent route but not logged in, redirect to login
    if (isPrintAgentRoute && !sessionClaims) {
      console.log('Electron: On print-agent route but not logged in, redirecting to login')
      return NextResponse.redirect(new URL('/print-agent/login', req.url))
    }

    // If on print-agent route but not a print agent, redirect to login
    if (isPrintAgentRoute && !isPrintAgent) {
      console.log('Electron: On print-agent route but not a print agent, redirecting to login')
      return NextResponse.redirect(new URL('/print-agent/login', req.url))
    }

    // If not on a print-agent route, redirect to print-agent
    if (!isPrintAgentRoute) {
      console.log('Electron: Not on print-agent route, redirecting to print-agent')
      return NextResponse.redirect(new URL('/print-agent', req.url))
    }

    // Allow access to print-agent routes if logged in and is print agent
    console.log('Electron: Allowing access to print-agent route')
    return NextResponse.next()
  }

  // If maintenance mode is active and user is not admin, print agent, or electron app
  if (isMaintenanceMode && !isAdmin && !isPrintAgent && !isElectron && !isMaintenancePage) {
    console.log('Maintenance mode: Redirecting to maintenance page')
    return NextResponse.redirect(new URL('/maintenance', req.url))
  }

  // If maintenance mode is active and user is admin, print agent, or electron app, allow access to all routes
  if (isMaintenanceMode && (isAdmin || isPrintAgent || isElectron)) {
    console.log('Maintenance mode: Allowing access (admin/print-agent/electron)')
    return NextResponse.next()
  }

  // If the request is not for a public route, protect it
  if (!isPublicRouteMatch) {
    await auth.protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}