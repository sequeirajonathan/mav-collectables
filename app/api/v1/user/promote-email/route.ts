import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(session.userId);
    const emails = user.emailAddresses || [];

    const primaryId = user.primaryEmailAddressId;
    // Find the most recently verified, non-primary email
    const verifiedNonPrimary = emails
      .filter(e => e.verification?.status === 'verified' && e.id !== primaryId)
      .sort((a, b) => b.id.localeCompare(a.id)); // fallback: sort by id

    if (!verifiedNonPrimary.length) {
      return NextResponse.json({ error: 'No newly verified email to promote' }, { status: 400 });
    }

    const newPrimary = verifiedNonPrimary[0];
    // Set as primary
    await client.emailAddresses.updateEmailAddress(newPrimary.id, { primary: true });

    // Remove the old primary email and any unverified, non-primary emails
    const toDelete = emails.filter(e => 
      e.id !== newPrimary.id && (
        e.verification?.status !== 'verified' || 
        e.id === primaryId // Also remove the old primary email
      )
    );
    
    for (const email of toDelete) {
      try {
        await client.emailAddresses.deleteEmailAddress(email.id);
        console.log('[Promote Email] Deleted email:', { id: email.id, email: email.emailAddress, wasPrimary: email.id === primaryId });
      } catch (err) {
        console.error('[Promote Email] Error deleting email:', { id: email.id, email: email.emailAddress, err });
      }
    }

    return NextResponse.json({ success: true, newPrimary: newPrimary.emailAddress });
  } catch (error) {
    console.error('Error promoting email:', error);
    return NextResponse.json({ error: 'Failed to promote email' }, { status: 500 });
  }
} 