import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId, data } = await req.json();
    
    console.log('Creating cart with:', { userId, data });
    
    // Validate the data structure
    if (!userId) {
      console.error('Missing userId in cart creation');
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    if (!data || !data.items || !Array.isArray(data.items)) {
      console.error('Invalid data structure in cart creation:', data);
      return NextResponse.json(
        { error: 'Invalid data structure' },
        { status: 400 }
      );
    }

    // Check for existing active cart for this userId
    const existingCart = await prisma.cart.findFirst({
      where: {
        userId,
        status: 'active',
      },
    });
    if (existingCart) {
      console.log('Active cart already exists for userId:', userId, 'Returning existing cart:', existingCart.id);
      return NextResponse.json({ cartId: existingCart.id });
    }
    
    // Clean up any old active carts for this user (safety measure)
    await prisma.cart.updateMany({
      where: {
        userId,
        status: 'active',
      },
      data: {
        status: 'abandoned',
      },
    });
    
    const cart = await prisma.cart.create({
      data: {
        userId,
        data,
      },
    });
    
    console.log('Cart created successfully:', cart.id);
    return NextResponse.json({ cartId: cart.id });
  } catch (error) {
    console.error('Error creating cart:', error);
    return NextResponse.json(
      { error: 'Failed to create cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Optional: GET all carts (for admin/debug)
export async function GET() {
  try {
    // Test database connection first
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connection successful');
    
    const carts = await prisma.cart.findMany();
    console.log('All carts in database:', carts.map(c => ({ id: c.id, userId: c.userId, status: c.status })));
    
    // Also fetch all Square customers for debugging
    try {
      const { createSquareClient } = await import('@lib/square');
      const client = createSquareClient();
      const customersResponse = await client.customers.search({
        query: {
          filter: {}
        }
      });
      
      console.log('All Square customers:', customersResponse.customers?.map(c => ({
        id: c.id,
        email: c.emailAddress,
        phone: c.phoneNumber,
        name: `${c.givenName} ${c.familyName}`,
        referenceId: c.referenceId
      })) || []);
    } catch (squareError) {
      console.error('Error fetching Square customers:', squareError);
    }
    
    return NextResponse.json({ carts });
  } catch (error) {
    console.error('Error fetching carts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch carts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 