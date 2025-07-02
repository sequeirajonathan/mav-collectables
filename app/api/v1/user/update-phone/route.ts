import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPhoneNumber } = await request.json();

    if (!newPhoneNumber) {
      return NextResponse.json({ error: 'New phone number is required' }, { status: 400 });
    }

    // Get the user's current phone numbers
    const client = await clerkClient();
    const user = await client.users.getUser(session.userId);
    const existingPhone = user.phoneNumbers?.[0];

    if (existingPhone) {
      // Add the new phone number first
      const newPhone = await client.phoneNumbers.createPhoneNumber({
        userId: session.userId,
        phoneNumber: newPhoneNumber
      });

      // Delete the old phone number if it exists and is not the new one
      if (existingPhone && existingPhone.id !== newPhone.id) {
        try {
          await client.phoneNumbers.deletePhoneNumber(existingPhone.id);
        } catch (deleteErr) {
          console.error('Error deleting old phone number:', deleteErr);
        }
      }
      
      console.log('Phone number updated successfully:', {
        oldPhoneNumberId: existingPhone.id,
        newPhoneNumber
      });
    } else {
      // Create a new phone number if none exists
      await client.phoneNumbers.createPhoneNumber({
        userId: session.userId,
        phoneNumber: newPhoneNumber
      });
      
      console.log('Phone number created successfully:', { newPhoneNumber });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating phone number:', error);
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
} 