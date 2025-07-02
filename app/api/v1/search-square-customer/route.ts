import { NextRequest, NextResponse } from 'next/server';
import { createSquareClient } from '@lib/square';
import { serializeBigIntValues } from '@utils/serialization';

export async function POST(req: NextRequest) {
  try {
    const { email, phoneNumber, referenceId } = await req.json();

    console.log('=== Customer Search Request ===');
    console.log('Email:', email);
    console.log('Phone Number:', phoneNumber);
    console.log('Reference ID:', referenceId);

    if (!email && !phoneNumber && !referenceId) {
      console.log('Error: No email, phone, or reference ID provided');
      return NextResponse.json(
        { error: 'Email, phone number, or reference ID is required' },
        { status: 400 }
      );
    }

    const client = createSquareClient();
    const customers = [];

    // Search by reference ID first (highest priority to prevent duplicates)
    if (referenceId) {
      try {
        console.log('Searching by reference ID:', referenceId);
        const referenceResponse = await client.customers.search({
          query: {
            filter: {
              referenceId: {
                exact: referenceId
              }
            }
          }
        });
        
        console.log('Reference ID search response:', {
          customersFound: referenceResponse.customers?.length || 0,
          customers: referenceResponse.customers?.map(c => ({
            id: c.id,
            email: c.emailAddress,
            phone: c.phoneNumber,
            name: `${c.givenName} ${c.familyName}`,
            referenceId: c.referenceId
          }))
        });
        
        if (referenceResponse.customers) {
          customers.push(...referenceResponse.customers);
        }
      } catch (error) {
        console.error('Error searching by reference ID:', error);
      }
    }

    // Search by phone number (second priority)
    if (phoneNumber) {
      try {
        console.log('Searching by phone number:', phoneNumber);
        const phoneResponse = await client.customers.search({
          query: {
            filter: {
              phoneNumber: {
                exact: phoneNumber
              }
            }
          }
        });
        
        console.log('Phone search response:', {
          customersFound: phoneResponse.customers?.length || 0,
          customers: phoneResponse.customers?.map(c => ({
            id: c.id,
            email: c.emailAddress,
            phone: c.phoneNumber,
            name: `${c.givenName} ${c.familyName}`
          }))
        });
        
        if (phoneResponse.customers) {
          customers.push(...phoneResponse.customers);
        }
      } catch (error) {
        console.error('Error searching by phone:', error);
      }
    }

    // Search by email if provided
    if (email) {
      try {
        console.log('Searching by email:', email);
        const emailResponse = await client.customers.search({
          query: {
            filter: {
              emailAddress: {
                exact: email
              }
            }
          }
        });
        
        console.log('Email search response:', {
          customersFound: emailResponse.customers?.length || 0,
          customers: emailResponse.customers?.map(c => ({
            id: c.id,
            email: c.emailAddress,
            phone: c.phoneNumber,
            name: `${c.givenName} ${c.familyName}`
          }))
        });
        
        if (emailResponse.customers) {
          customers.push(...emailResponse.customers);
        }
      } catch (error) {
        console.error('Error searching by email:', error);
      }
    }

    // Remove duplicates based on customer ID
    const uniqueCustomers = customers.filter((customer, index, self) => 
      index === self.findIndex(c => c.id === customer.id)
    );

    console.log('=== Final Results ===');
    console.log('Total unique customers found:', uniqueCustomers.length);
    console.log('Customers:', uniqueCustomers.map(c => ({
      id: c.id,
      email: c.emailAddress,
      phone: c.phoneNumber,
      name: `${c.givenName} ${c.familyName}`,
      referenceId: c.referenceId
    })));

    // Serialize the response to handle BigInt values
    const serializedCustomers = JSON.parse(JSON.stringify(uniqueCustomers, serializeBigIntValues));

    return NextResponse.json({ 
      customers: serializedCustomers,
      exists: uniqueCustomers.length > 0
    });

  } catch (error) {
    console.error('Error searching for customer:', error);
    return NextResponse.json(
      { error: 'Failed to search for customer' },
      { status: 500 }
    );
  }
} 