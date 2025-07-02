import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@lib/prisma';

interface MergeRequest {
  guestId: string;
  userId: string;
}

interface CartData {
  items: Array<{ id: string; quantity: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guestId, userId }: MergeRequest = await request.json();

    // Find guest and user carts
    const guestCart = await prisma.cart.findFirst({ where: { userId: guestId, status: 'active' } });
    const userCart = await prisma.cart.findFirst({ where: { userId, status: 'active' } });

    if (!guestCart && !userCart) {
      return NextResponse.json({ message: 'No carts to merge' });
    }

    // Prefer the cart with more info (e.g., shipping address, items)
    let mergedCart = userCart || guestCart;
    if (guestCart && userCart) {
      // Merge items, prefer more complete data
      const guestItems = (guestCart.data as CartData)?.items || [];
      const userItems = (userCart.data as CartData)?.items || [];
      const mergedItems = [...userItems];

      for (const guestItem of guestItems) {
        const existing = mergedItems.find((i) => i.id === guestItem.id);
        if (existing) existing.quantity += guestItem.quantity;
        else mergedItems.push(guestItem);
      }

      // Prefer address/info from the cart with more fields filled
      const guestFields = Object.keys(guestCart.data || {}).length;
      const userFields = Object.keys(userCart.data || {}).length;
      const mergedData = userFields >= guestFields ? userCart.data : guestCart.data;
      if (!mergedData) {
        return NextResponse.json({ error: 'Invalid cart data' }, { status: 400 });
      }
      (mergedData as CartData).items = mergedItems;

      // Update user cart with merged data
      await prisma.cart.update({
        where: { id: userCart.id },
        data: { data: mergedData }
      });

      // Abandon guest cart
      await prisma.cart.update({
        where: { id: guestCart.id },
        data: { status: 'abandoned' }
      });

      mergedCart = await prisma.cart.findUnique({ where: { id: userCart.id } });
    } else if (guestCart && !userCart) {
      // Convert guest cart to user cart
      await prisma.cart.update({
        where: { id: guestCart.id },
        data: { userId, status: 'active' }
      });
      mergedCart = await prisma.cart.findUnique({ where: { id: guestCart.id } });
    }

    return NextResponse.json({ success: true, cart: mergedCart });
  } catch (error) {
    console.error('Cart merge error:', error);
    return NextResponse.json({ error: 'Cart merge failed' }, { status: 500 });
  }
} 