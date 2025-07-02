import { NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export async function POST() {
  try {
    // Clean up old guest carts (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedCarts = await prisma.cart.deleteMany({
      where: {
        userId: { startsWith: 'guest-' },
        status: 'active',
        createdAt: { lt: thirtyDaysAgo }
      }
    });

    // Clean up merged carts (these should be deleted immediately after merge, but handle any that might exist)
    const deletedMergedCarts = await prisma.cart.deleteMany({
      where: {
        status: 'merged'
      }
    });

    // Clean up completed carts older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const deletedCompletedCarts = await prisma.cart.deleteMany({
      where: {
        status: 'completed',
        createdAt: { lt: ninetyDaysAgo }
      }
    });

    return NextResponse.json({
      success: true,
      deletedGuestCarts: deletedCarts.count,
      deletedMergedCarts: deletedMergedCarts.count,
      deletedCompletedCarts: deletedCompletedCarts.count
    });

  } catch (error) {
    console.error('Cart cleanup error:', error);
    return NextResponse.json({ error: 'Cart cleanup failed' }, { status: 500 });
  }
} 