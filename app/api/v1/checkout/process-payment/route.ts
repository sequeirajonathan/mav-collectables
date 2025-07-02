import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { createSquareClient } from '@lib/square';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

interface PaymentRequest {
  customerId: string;
  amount: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  token: string;
  paymentMethod: string;
  customerInfo?: {
    givenName: string;
    familyName: string;
    emailAddress: string;
    phoneNumber: string;
    address: {
      addressLine1: string;
      locality: string;
      postalCode: string;
      administrativeDistrictLevel1: string;
      country: string;
    };
  };
  isGuest: boolean;
  cartId?: string;
}

// Helper function to create or find Square customer
async function createOrFindSquareCustomer(customerInfo: PaymentRequest['customerInfo'], userId?: string) {
  const squareClient = createSquareClient();
  
  if (!customerInfo) {
    throw new Error('Customer information is required');
  }

  // First, try to find existing customer by email
  const emailSearch = {
    query: { filter: { emailAddress: { exact: customerInfo.emailAddress } } }
  };
  
  const emailResponse = await squareClient.customers.search(emailSearch);
  if (emailResponse.customers?.length) {
    const existingCustomer = emailResponse.customers[0];
    
    // If user is authenticated, update the customer with their Clerk user ID
    if (userId && !existingCustomer.referenceId && existingCustomer.id) {
      await squareClient.customers.update({
        customerId: existingCustomer.id,
        referenceId: userId
      });
    }
    
    return existingCustomer;
  }

  // If not found, create new customer
  const createResult = await squareClient.customers.create({
    givenName: customerInfo.givenName,
    familyName: customerInfo.familyName,
    emailAddress: customerInfo.emailAddress,
    phoneNumber: customerInfo.phoneNumber,
    referenceId: userId || undefined,
    address: {
      addressLine1: customerInfo.address.addressLine1,
      locality: customerInfo.address.locality,
      postalCode: customerInfo.address.postalCode,
      administrativeDistrictLevel1: customerInfo.address.administrativeDistrictLevel1,
      country: customerInfo.address.country as 'US'
    }
  });

  return createResult.customer;
}

// Helper function to process Square payment
async function processSquarePayment(customerId: string, amount: number, token: string) {
  const squareClient = createSquareClient();
  
  const payment = await squareClient.payments.create({
    sourceId: token,
    amountMoney: {
      amount: BigInt(amount),
      currency: 'USD'
    },
    customerId: customerId,
    locationId: process.env.SQUARE_LOCATION_ID!,
    idempotencyKey: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });

  return payment.payment;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body: PaymentRequest = await request.json();
    const { customerId, amount, items, token, isGuest, cartId, customerInfo } = body;

    // Validate required fields
    if (!amount || !items || !token) {
      return NextResponse.json({ error: 'Missing required payment information' }, { status: 400 });
    }

    let squareCustomer;
    const userId = session?.userId;

    if (isGuest) {
      // Guest checkout: create or find Square customer
      if (!customerInfo) {
        return NextResponse.json({ error: 'Customer information required for guest checkout' }, { status: 400 });
      }
      
      squareCustomer = await createOrFindSquareCustomer(customerInfo, userId || undefined);
      console.log('Guest customer created/found:', squareCustomer?.id);
    } else {
      // Authenticated user: find existing Square customer
      if (!userId) {
        return NextResponse.json({ error: 'User must be authenticated for non-guest checkout' }, { status: 401 });
      }

      // Find Square customer by referenceId (Clerk user ID)
      const squareClient = createSquareClient();
      const searchResponse = await squareClient.customers.search({
        query: { filter: { referenceId: { exact: userId } } }
      });

      if (!searchResponse.customers?.length) {
        // Create Square customer for authenticated user if not exists
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const createResult = await squareClient.customers.create({
          givenName: clerkUser.firstName || undefined,
          familyName: clerkUser.lastName || undefined,
          emailAddress: clerkUser.emailAddresses?.[0]?.emailAddress || '',
          phoneNumber: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
          referenceId: userId
        });
        squareCustomer = createResult.customer;
      } else {
        squareCustomer = searchResponse.customers[0];
      }
    }

    if (!squareCustomer) {
      return NextResponse.json({ error: 'Failed to create or find customer' }, { status: 500 });
    }

    if (!squareCustomer.id) {
      return NextResponse.json({ error: 'Customer ID missing' }, { status: 500 });
    }

    // Process payment through Square
    const payment = await processSquarePayment(squareCustomer.id, amount, token);
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
    }

    // Update cart status to completed
    if (cartId) {
      await prisma.cart.update({
        where: { id: cartId },
        data: { status: 'completed' }
      });
    }

    // If this was a guest checkout, clean up old guest carts
    if (isGuest && customerId.startsWith('guest-')) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.cart.deleteMany({
        where: {
          userId: { startsWith: 'guest-' },
          status: 'active',
          createdAt: { lt: thirtyDaysAgo }
        }
      });
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      orderId: `order-${Date.now()}`,
      customerId: squareCustomer.id,
      status: payment.status
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ 
      error: 'Payment processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 