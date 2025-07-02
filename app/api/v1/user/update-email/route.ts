import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Email Update API Route Called ===');
    
    const session = await auth();
    console.log('Session check:', { hasSession: !!session, userId: session?.userId });
    
    if (!session?.userId) {
      console.log('No session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newEmailAddress } = await request.json();
    console.log('Request body:', { newEmailAddress });

    if (!newEmailAddress) {
      console.log('No email address provided, returning 400');
      return NextResponse.json({ error: 'New email address is required' }, { status: 400 });
    }

    // Get the user's current email addresses
    const client = await clerkClient();
    console.log('Clerk client created');
    
    const user = await client.users.getUser(session.userId);
    console.log('User retrieved:', { 
      userId: user.id, 
      hasEmailAddresses: !!user.emailAddresses?.length,
      currentEmail: user.emailAddresses?.[0]?.emailAddress 
    });
    
    const existingEmail = user.emailAddresses?.[0];

    if (existingEmail) {
      console.log('Existing email found:', { emailId: existingEmail.id, email: existingEmail.emailAddress });
      
      // Instead of deleting and recreating, let's check if we can update the existing email
      // This might be safer than deleting the primary email
      if (existingEmail.emailAddress === newEmailAddress) {
        console.log('Email address is the same, no update needed');
        return NextResponse.json({ success: true, message: 'Email address unchanged' });
      }
      
      console.log('Email addresses are different, proceeding with update');
      
      // For now, let's just create a new email address without deleting the old one
      // This allows Clerk to handle the verification flow properly
      console.log('Creating new email address:', { newEmailAddress });
      const newEmailAddressResource = await client.emailAddresses.createEmailAddress({
        userId: session.userId,
        emailAddress: newEmailAddress
      });
      console.log('New email address created:', { newEmailId: newEmailAddressResource.id });
      
      console.log('Email address update initiated:', {
        oldEmailAddressId: existingEmail.id,
        newEmailAddress,
        newEmailId: newEmailAddressResource.id
      });
    } else {
      console.log('No existing email, creating new one:', { newEmailAddress });
      
      // Create a new email address if none exists
      const newEmailAddressResource = await client.emailAddresses.createEmailAddress({
        userId: session.userId,
        emailAddress: newEmailAddress
      });
      
      console.log('Email address created successfully:', { 
        newEmailAddress, 
        newEmailId: newEmailAddressResource.id 
      });
    }

    console.log('Email update completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('=== Email Update Error ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
    return NextResponse.json(
      { error: 'Failed to update email address' },
      { status: 500 }
    );
  }
} 