import { NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Test cart table
    const cartCount = await prisma.cart.count();
    
    // Test a simple query
    const recentCarts = await prisma.cart.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      cartCount,
      recentCarts: recentCarts.map(c => ({
        id: c.id,
        userId: c.userId,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 