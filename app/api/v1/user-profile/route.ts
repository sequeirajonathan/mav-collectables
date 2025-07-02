import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { UserRole, isAdminRole, UserRoleType } from '@interfaces/roles'
import { prisma } from '@lib/prisma'

export async function GET(_request: Request) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin/staff/event
    const role = (user.publicMetadata.role as UserRoleType) || UserRole.USER
    const isAdmin = isAdminRole(role)

    // If maintenance mode is enabled and user is not admin, return 503
    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true' && !isAdmin) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }

    // Fetch user profile from DB
    const profile = await prisma.user_profile.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    })

    return NextResponse.json({
      email: user.emailAddresses[0].emailAddress,
      role: role,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumbers[0]?.phoneNumber,
      emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
      phoneVerified: user.phoneNumbers[0]?.verification?.status === 'verified',
      lastLoginAt: user.lastSignInAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Shipping address
      address: profile?.address,
      city: profile?.city,
      state: profile?.state,
      zipCode: profile?.zipCode,
      country: profile?.country,
      // Billing address
      billingFirstName: profile?.billingFirstName,
      billingLastName: profile?.billingLastName,
      billingEmail: profile?.billingEmail,
      billingPhoneNumber: profile?.billingPhoneNumber,
      billingAddress: profile?.billingAddress,
      billingCity: profile?.billingCity,
      billingState: profile?.billingState,
      billingZipCode: profile?.billingZipCode,
      billingCountry: profile?.billingCountry,
    })
  } catch (error) {
    console.error('Error in user-profile route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const body = await request.json()
    // Upsert user profile with shipping and billing fields
    const updated = await prisma.user_profile.upsert({
      where: { email: user.emailAddresses[0].emailAddress },
      update: {
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        country: body.country,
        billingFirstName: body.billingFirstName,
        billingLastName: body.billingLastName,
        billingEmail: body.billingEmail,
        billingPhoneNumber: body.billingPhoneNumber,
        billingAddress: body.billingAddress,
        billingCity: body.billingCity,
        billingState: body.billingState,
        billingZipCode: body.billingZipCode,
        billingCountry: body.billingCountry,
      },
      create: {
        email: user.emailAddresses[0].emailAddress,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        country: body.country,
        billingFirstName: body.billingFirstName,
        billingLastName: body.billingLastName,
        billingEmail: body.billingEmail,
        billingPhoneNumber: body.billingPhoneNumber,
        billingAddress: body.billingAddress,
        billingCity: body.billingCity,
        billingState: body.billingState,
        billingZipCode: body.billingZipCode,
        billingCountry: body.billingCountry,
        role: (user.publicMetadata.role as UserRoleType) || UserRole.USER,
      },
    })
    return NextResponse.json({ success: true, profile: updated })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
} 