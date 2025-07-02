# MAV Collectibles

A Next.js e-commerce application for trading card games like Pokémon, Yu-Gi-Oh!, Dragon Ball, and more.

## Project Structure

```
mav-i/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Authentication routes grouped
│   │   ├── login/          # Login page
│   │   ├── signup/         # Signup page
│   │   └── [...]/          # Other auth routes
│   ├── (shop)/             # Shop-related pages grouped
│   │   ├── cart/           # Shopping cart
│   │   ├── products/       # Products pages
│   │   └── [...]/          # Other shop routes
│   ├── admin/              # Admin dashboard and features
│   ├── api/                # API routes
│   │   ├── alerts/         # Alert API endpoints
│   │   ├── auth/           # Auth API endpoints
│   │   ├── feature-flags/  # Feature flags endpoints
│   │   ├── products/       # Products API endpoints
│   │   └── [...]/          # Other API routes
│   └── [...]/              # Other page routes
├── components/             # React components
│   ├── cards/              # Card-specific components
│   ├── forms/              # Form-related components
│   ├── layout/             # Layout components
│   │   ├── footer/         # Footer components
│   │   ├── header/         # Header components
│   │   └── [...]/          # Other layout components
│   ├── media/              # Media-related components
│   │   ├── carousel/       # Carousel components
│   │   ├── video/          # Video player components
│   │   └── [...]/          # Other media components
│   ├── product/            # Product-related components
│   ├── ui/                 # UI components (buttons, inputs, etc.)
│   └── [...]/              # Other component categories
├── config/                 # Application configuration
├── context/                # React Context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Library code and utilities
│   ├── api/                # API client functions
│   ├── db/                 # Database utilities
│   ├── validations/        # Validation schemas
│   └── [...]/              # Other utilities
├── prisma/                 # Prisma ORM configuration
├── public/                 # Static files
│   ├── images/             # Image assets
│   ├── fonts/              # Font files
│   └── [...]/              # Other public assets
├── styles/                 # CSS and styling files
└── types/                  # TypeScript type definitions
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.example` to `.env.local`
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Trading card inventory management
- User authentication
- Shopping cart
- Admin dashboard
- Feature flags for controlled feature rollout
- Video content integration

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Square Web Payments SDK Setup

This app now uses Square's Web Payments SDK for in-house payment processing, supporting multiple payment methods:

- **Credit/Debit Cards** - Standard card payments with custom styling
- **Apple Pay** - Native Apple Pay integration (requires HTTPS and domain verification)
- **Google Pay** - Native Google Pay integration
- **Afterpay/Clearpay** - Buy now, pay later (available in supported regions)
- **Cash App Pay** - Direct Cash App integration

### Environment Variables Required

Add these to your `.env.local` file:

```env
# Square Configuration
NEXT_PUBLIC_SQUARE_APP_ID=your_square_application_id
SQUARE_SECRET_KEY=your_square_secret_key
SQUARE_ENVIRONMENT=sandbox  # or 'production'
NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox  # or 'production' (for client-side use)
SQUARE_LOCATION_ID=your_square_location_id  # Your Square location ID for inventory and payments

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Features

✅ **No External Redirects** - All payments processed in-house with your custom UI
✅ **Multiple Payment Methods** - Support for cards, Apple Pay, Google Pay, Afterpay, and Cash App Pay
✅ **Custom Styling** - Full control over payment form appearance to match your theme
✅ **Secure Token Processing** - Square handles sensitive card data, you only receive secure tokens
✅ **Guest Checkout** - Support for both authenticated and guest checkout flows
✅ **TypeScript Support** - Full type safety throughout the payment flow

### Payment Flow

1. **Cart → Checkout** - User adds items and proceeds to checkout
2. **Customer Info** - Collect shipping/billing information
3. **Payment Page** - Square Web Payments SDK renders payment methods
4. **Token Generation** - Square creates secure payment token
5. **Backend Processing** - Your API processes the token with Square's API
6. **Success** - User redirected to confirmation page

### Browser Support

- **Apple Pay**: Safari on macOS/iOS with Apple Pay setup
- **Google Pay**: Chrome/Edge with Google Pay setup
- **Afterpay**: Supported regions (US, UK, Australia, etc.)
- **Cash App Pay**: Users with Cash App accounts
- **Cards**: All modern browsers

The SDK automatically detects available payment methods and only shows supported options to each user.
