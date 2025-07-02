import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ cartId: string }> }) {
  try {
    const { cartId } = await params;
    console.log('Fetching cart:', cartId);
    
    // Validate cartId format
    if (!cartId || typeof cartId !== 'string') {
      console.error('Invalid cartId:', cartId);
      return NextResponse.json({ error: 'Invalid cart ID' }, { status: 400 });
    }
    
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
    });
    
    if (!cart) {
      console.log('Cart not found:', cartId);
      
      // Check if there are any carts in the database for debugging
      const allCarts = await prisma.cart.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      console.log('Recent carts in database:', allCarts.map(c => ({ id: c.id, userId: c.userId, status: c.status, createdAt: c.createdAt })));
      
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }
    
    console.log('Cart found:', cart.id, 'Status:', cart.status, 'UserId:', cart.userId);
    return NextResponse.json({ cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cartId: string }> }) {
  try {
    const { cartId } = await params;
    const { data } = await req.json();
    
    console.log('Updating cart:', cartId, 'with data:', data);
    
    const cart = await prisma.cart.update({
      where: { id: cartId },
      data: { data },
    });
    
    console.log('Cart updated successfully:', cart.id);
    return NextResponse.json({ cart });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { error: 'Failed to update cart', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 