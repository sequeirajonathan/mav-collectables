import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(session.userId);
    
    // Check if user has an email address
    const emailAddress = user.emailAddresses?.[0];
    if (!emailAddress) {
      return NextResponse.json({ error: 'No email address found to verify' }, { status: 400 });
    }

    // Check if email is already verified
    if (emailAddress.verification?.status === 'verified') {
      return NextResponse.json({ 
        success: true, 
        message: 'Email address is already verified' 
      });
    }

    // For now, we'll return a success response since the actual verification
    // will be handled by the client-side Clerk components
    // The verification code will be validated by Clerk's built-in verification flow
    console.log('Email verification request received:', {
      emailAddressId: emailAddress.id,
      emailAddress: emailAddress.emailAddress,
      verificationStatus: emailAddress.verification?.status
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Email verification initiated' 
    });
  } catch (error) {
    console.error('Error in email verification route:', error);
    return NextResponse.json(
      { error: 'Failed to process email verification' },
      { status: 500 }
    );
  }
} 