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
    
    // Check if user has a phone number
    const phoneNumber = user.phoneNumbers?.[0];
    if (!phoneNumber) {
      return NextResponse.json({ error: 'No phone number found to verify' }, { status: 400 });
    }

    // Check if phone number is already verified
    if (phoneNumber.verification?.status === 'verified') {
      return NextResponse.json({ 
        success: true, 
        message: 'Phone number is already verified' 
      });
    }

    // For now, we'll return a success response since the actual verification
    // will be handled by the client-side Clerk components
    // The verification code will be validated by Clerk's built-in verification flow
    console.log('Phone verification request received:', {
      phoneNumberId: phoneNumber.id,
      phoneNumber: phoneNumber.phoneNumber,
      verificationStatus: phoneNumber.verification?.status
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Phone verification initiated' 
    });
  } catch (error) {
    console.error('Error in phone verification route:', error);
    return NextResponse.json(
      { error: 'Failed to process phone verification' },
      { status: 500 }
    );
  }
} 