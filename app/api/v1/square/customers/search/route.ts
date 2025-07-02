import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createSquareClient } from '@lib/square';
import { z } from 'zod';
import { serializeBigIntValues } from '@utils/serialization';
import { Square } from 'square';

const searchSchema = z.object({
  phoneNumber: z.string().optional(),
  referenceId: z.string().optional(),
  createIfNotFound: z.boolean().optional().default(true),
  // Form data for creating new customers
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  emailAddress: z.string().optional(),
  address: z.object({
    addressLine1: z.string(),
    locality: z.string(),
    postalCode: z.string(),
    administrativeDistrictLevel1: z.string(),
    country: z.string()
  }).optional()
}).refine(data => data.phoneNumber || data.referenceId, {
  message: "Either phoneNumber or referenceId must be provided"
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
      console.error('[GET /square/customers/search] No user session', { session });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');

    if (!phoneNumber) {
      console.error('[GET /square/customers/search] Missing phone number', { searchParams: request.url });
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const client = createSquareClient();
    const searchQuery = {
      count: true,
      query: {
        filter: {
          phoneNumber: {
            exact: `+1${phoneNumber.replace(/^\+1|\D/g, '')}`,
          },
        },
        sort: {
          field: "DEFAULT" as Square.CustomerSortField,
          order: "ASC" as Square.SortOrder,
        },
      },
    };
    
    console.log('[GET /square/customers/search] Square search query:', JSON.stringify(searchQuery, null, 2));
    
    const response = await client.customers.search(searchQuery);
    console.log('[GET /square/customers/search] Square API response:', JSON.stringify(response, serializeBigIntValues, 2));

    if (!response.customers?.length) {
      console.warn('[GET /square/customers/search] No customers found for', { phoneNumber });
      return NextResponse.json(null);
    }

    // Transform the Square response to match our interface
    const customer = response.customers[0];
    console.log('[GET /square/customers/search] Raw customer data:', {
      id: customer.id,
      segmentIds: customer.segmentIds,
      creationSource: customer.creationSource
    });
    
    const serializedCustomer = {
      id: customer.id || '',
      emailAddress: customer.emailAddress,
      givenName: customer.givenName,
      familyName: customer.familyName,
      phoneNumber: customer.phoneNumber,
      address: customer.address ? {
        addressLine1: customer.address.addressLine1,
        addressLine2: customer.address.addressLine2,
        locality: customer.address.locality,
        postalCode: customer.address.postalCode,
        administrativeDistrictLevel1: customer.address.administrativeDistrictLevel1,
        country: customer.address.country,
      } : undefined,
      referenceId: customer.referenceId,
      segmentIds: customer.segmentIds,
      creationSource: customer.creationSource,
    };

    console.log('[GET /square/customers/search] Serialized customer:', {
      id: serializedCustomer.id,
      segmentIds: serializedCustomer.segmentIds,
      creationSource: serializedCustomer.creationSource
    });

    return NextResponse.json(JSON.parse(JSON.stringify(serializedCustomer, serializeBigIntValues)));
  } catch (error) {
    console.error('[GET /square/customers/search] Error:', error instanceof Error ? error.stack || error.message : error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to search customers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, referenceId, createIfNotFound = true, givenName: formGivenName, familyName: formFamilyName, emailAddress: formEmailAddress, address: formAddress } = searchSchema.parse(body);

    console.log('[POST /square/customers/search] Search params:', { phoneNumber, referenceId, createIfNotFound });

    const squareClient = createSquareClient();
    
    // Build search query based on available parameters
    // Always search by referenceId first if present
    let customer: Square.Customer | null | undefined = null;
    if (referenceId) {
      const refIdSearch = {
        query: { filter: { referenceId: { exact: referenceId } } }
      };
      const refIdResponse = await squareClient.customers.search(refIdSearch);
      if (refIdResponse.customers?.length) {
        customer = refIdResponse.customers[0];
      }
    }

    // If not found by referenceId, search by phone
    if (!customer && phoneNumber) {
      const phoneSearch = {
        query: { filter: { phoneNumber: { exact: phoneNumber } } }
      };
      const phoneResponse = await squareClient.customers.search(phoneSearch);
      if (phoneResponse.customers?.length) {
        customer = phoneResponse.customers[0];
      }
    }

    // If still not found, search by email
    if (!customer && formEmailAddress) {
      const emailSearch = {
        query: { filter: { emailAddress: { exact: formEmailAddress } } }
      };
      const emailResponse = await squareClient.customers.search(emailSearch);
      if (emailResponse.customers?.length) {
        customer = emailResponse.customers[0];
      }
    }

    // If still not found and createIfNotFound, create new customer
    if (!customer && createIfNotFound) {
      // No customer found, create one using form data or Clerk user info
      console.log('About to call clerkClient.users.getUser with session.userId:', session.userId);
      
      const client = await clerkClient();
      console.log('clerkClient.users available:', !!client?.users);
      
      const clerkUser = await client.users.getUser(session.userId);
      
      // Use form data if available, otherwise fall back to Clerk user data
      const email = formEmailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
      const givenName = formGivenName || clerkUser.firstName || undefined;
      const familyName = formFamilyName || clerkUser.lastName || undefined;
      const customerReferenceId = session.userId;
      
      const createResult = await squareClient.customers.create({
        givenName,
        familyName,
        emailAddress: email,
        phoneNumber: phoneNumber || undefined,
        referenceId: customerReferenceId,
        address: formAddress ? {
          addressLine1: formAddress.addressLine1,
          locality: formAddress.locality,
          postalCode: formAddress.postalCode,
          administrativeDistrictLevel1: formAddress.administrativeDistrictLevel1,
          country: formAddress.country as Square.Country
        } : undefined
      });
      customer = createResult.customer || null;
    }

    // Ensure customer exists before serializing
    if (!customer) {
      return NextResponse.json({ customer: null }, { status: 200 });
    }

    // Extract and serialize the customer data
    const serializedCustomer = {
      id: customer.id,
      givenName: customer.givenName,
      familyName: customer.familyName,
      emailAddress: customer.emailAddress,
      phoneNumber: customer.phoneNumber,
      address: customer.address ? {
        addressLine1: customer.address.addressLine1,
        addressLine2: customer.address.addressLine2,
        locality: customer.address.locality,
        administrativeDistrictLevel1: customer.address.administrativeDistrictLevel1,
        postalCode: customer.address.postalCode,
        country: customer.address.country
      } : undefined,
      note: customer.note,
      referenceId: customer.referenceId,
      segmentIds: customer.segmentIds,
      creationSource: customer.creationSource,
    };

    console.log('[POST /square/customers/search] Customer data:', {
      id: serializedCustomer.id,
      segmentIds: serializedCustomer.segmentIds,
      creationSource: serializedCustomer.creationSource
    });

    return NextResponse.json(serializedCustomer);
  } catch (error) {
    console.error('Error searching Square customer:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to search customer' },
      { status: 500 }
    );
  }
} 