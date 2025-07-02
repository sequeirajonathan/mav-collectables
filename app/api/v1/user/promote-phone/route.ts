import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneId } = await request.json();
    if (!phoneId) {
      return NextResponse.json({ error: 'Missing phoneId in request' }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(session.userId);
    const phones = user.phoneNumbers || [];
    const primaryId = user.primaryPhoneNumberId;

    console.log('[Promote Phone] User:', user.id);
    console.log('[Promote Phone] All phones:', phones.map(p => ({ id: p.id, number: p.phoneNumber, verified: p.verification?.status, primary: p.id === primaryId })));
    console.log('[Promote Phone] Requested phoneId:', phoneId);

    const verified = phones.find(p => p.id === phoneId && p.verification?.status === 'verified');
    if (!verified) {
      console.log('[Promote Phone] Phone not found or not verified:', phoneId);
      return NextResponse.json({ error: 'Phone not verified or not found' }, { status: 400 });
    }

    // Promote the verified phone using updateUser
    await client.users.updateUser(user.id, { primaryPhoneNumberID: phoneId });
    console.log('[Promote Phone] Set as primary via updateUser:', phoneId);

    // Remove the old primary phone and any unverified, non-primary phones
    const toDelete = phones.filter(p => 
      p.id !== phoneId && (
        p.verification?.status !== 'verified' || 
        p.id === primaryId // Also remove the old primary phone
      )
    );
    
    for (const phone of toDelete) {
      try {
        await client.phoneNumbers.deletePhoneNumber(phone.id);
        console.log('[Promote Phone] Deleted phone:', { id: phone.id, number: phone.phoneNumber, wasPrimary: phone.id === primaryId });
      } catch (err) {
        console.error('[Promote Phone] Error deleting phone:', { id: phone.id, number: phone.phoneNumber, err });
      }
    }

    // Refetch user to confirm
    const updatedUser = await client.users.getUser(session.userId);
    const updatedPrimary = updatedUser.phoneNumbers?.find(p => p.id === updatedUser.primaryPhoneNumberId);
    console.log('[Promote Phone] Updated primary:', updatedPrimary);

    return NextResponse.json({ success: true, newPrimary: updatedPrimary?.phoneNumber });
  } catch (error) {
    console.error('Error promoting phone:', error);
    return NextResponse.json({ error: 'Failed to promote phone' }, { status: 500 });
  }
} 