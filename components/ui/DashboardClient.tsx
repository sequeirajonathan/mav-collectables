'use client'

import Image from 'next/image'
import { UserRole, isAdminRole } from '@interfaces/roles';
import { UserProfile } from '@interfaces/userProfile';
import { useSearchSquareCustomer } from '@hooks/useSearchSquareCustomer';
import { Crown } from 'lucide-react';
import Link from 'next/link';

interface DashboardClientProps {
  user: UserProfile;
}

// Helper function to check if customer has loyalty segments
const hasLoyaltySegments = (segmentIds: string[] | undefined): boolean => {
  if (!segmentIds || segmentIds.length === 0) return false;
  
  const loyaltySegments = [
    'ML7Q0A4DGP4KY.LOYALTY_ALL',
    'ML7Q0A4DGP4KY.LOYAL',
    'ML7Q0A4DGP4KY.LOYALTY',
    'LOYALTY_ALL',
    'LOYAL',
    'LOYALTY'
  ];
  
  return segmentIds.some(segmentId => 
    loyaltySegments.some(loyaltySegment => 
      segmentId.includes(loyaltySegment)
    )
  );
};

export default function DashboardClient({ user }: DashboardClientProps) {
  const userRole = user.role || UserRole.USER;
  const { customer, isLoading } = useSearchSquareCustomer(
    user.phoneNumber?.replace(/\D/g, '').slice(-10)
  );

  // Check if customer has loyalty segments
  const isLoyaltyCustomer = customer ? hasLoyaltySegments(customer.segmentIds) : false;

  // Debug logging
  console.log('DashboardClient Debug:', {
    user,
    customer,
    isLoading,
    customerSegmentIds: customer?.segmentIds,
    isLoyaltyCustomer,
    phoneNumber: user.phoneNumber?.replace(/\D/g, '').slice(-10),
    customerName: customer ? `${customer.givenName || ''} ${customer.familyName || ''}`.trim() : 'No name',
    customerAddress: customer?.address ? 'Address exists' : 'No address',
    customerEmail: customer?.emailAddress || 'No email'
  });

  console.log('Customer:', customer);
  console.log('Customer Address:', customer?.address);
  console.log('Customer Name:', customer?.givenName, customer?.familyName);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-black border border-[#E6B325]/30 rounded-lg shadow-lg p-8">
        {/* Logo and Title Section */}
        <div className="flex items-center justify-center mb-8">
          <Image 
            src="/mav_collectibles.png" 
            alt="MAV Collectibles Logo" 
            width={150} 
            height={60} 
            className="w-auto h-auto"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-[#E6B325] mb-8 text-center">Dashboard</h1>
        
        <div className="space-y-8">
          {/* Account Information Section */}
          <div className="border border-[#E6B325]/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#E6B325] mb-6">Account Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-[#E6B325]/70 text-sm">Email</div>
                <div className="text-white">{user.email || ''}</div>
              </div>
              
              {isAdminRole(userRole) && (
                <div className="space-y-2">
                  <div className="text-[#E6B325]/70 text-sm">Role</div>
                  <div className="text-white">{userRole}</div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="text-[#E6B325]/70 text-sm">Account Created</div>
                <div className="text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-[#E6B325]/70 text-sm">Last Sign In</div>
                <div className="text-white">
                  {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information Section */}
          {isLoading ? (
            <div className="border border-[#E6B325]/30 rounded-lg p-6">
              <div className="text-[#E6B325]">Loading customer information...</div>
            </div>
          ) : customer ? (
            <div className="border border-[#E6B325]/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-semibold text-[#E6B325]">Customer Information</h2>
                {isLoyaltyCustomer && <Crown className="w-6 h-6 text-[#E6B325]" />}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name - prefer customer, fallback to user */}
                {((customer.givenName || customer.familyName) || (user.firstName || user.lastName)) && (
                  <div className="space-y-2">
                    <div className="text-[#E6B325]/70 text-sm">Name</div>
                    <div className="text-white">
                      {`${customer.givenName || user.firstName || ''} ${customer.familyName || user.lastName || ''}`.trim() || 'Name not provided'}
                    </div>
                  </div>
                )}
                
                {/* Address - prefer customer, fallback to user */}
                {(
                  customer.address?.addressLine1 || customer.address?.locality || customer.address?.postalCode ||
                  user.address || user.city || user.zipCode
                ) && (
                  <div className="space-y-2">
                    <div className="text-[#E6B325]/70 text-sm">Address</div>
                    <div className="text-white">
                      {/* Street Address */}
                      {customer.address?.addressLine1 || user.address || ''}
                      {/* Address Line 2 */}
                      {customer.address?.addressLine2 && <>, {customer.address.addressLine2}</>}
                      {/* City, ZIP */}
                      {((customer.address?.locality || user.city) || (customer.address?.postalCode || user.zipCode)) && (
                        <><br />
                          {customer.address?.locality || user.city || ''}
                          {(customer.address?.locality || user.city) && (customer.address?.postalCode || user.zipCode) ? ', ' : ''}
                          {customer.address?.postalCode || user.zipCode || ''}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Phone - prefer customer, fallback to user */}
                <div className="space-y-2">
                  <div className="text-[#E6B325]/70 text-sm">Phone</div>
                  <div className="text-white">{customer.phoneNumber || user.phoneNumber || 'Phone not provided'}</div>
                </div>
                
                {/* Email - prefer customer, fallback to user, only show if not redundant with Account Info */}
                {(customer.emailAddress && customer.emailAddress !== user.email) || (!customer.emailAddress && user.email) ? (
                  <div className="space-y-2">
                    <div className="text-[#E6B325]/70 text-sm">Email</div>
                    <div className="text-white">{customer.emailAddress || user.email}</div>
                  </div>
                ) : null}
                
                {/* Loyalty Status */}
                {isLoyaltyCustomer && (
                  <div className="space-y-2">
                    <div className="text-[#E6B325]/70 text-sm">Loyalty Status</div>
                    <div className="text-white flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#E6B325]" />
                      Loyalty Member
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-[#E6B325]/30 rounded-lg p-6">
              <div className="text-[#E6B325]">No customer information found</div>
            </div>
          )}

          {/* Quick Actions Section */}
          <div className="border border-[#E6B325]/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#E6B325] mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="w-full py-2 px-4 bg-[#E6B325] hover:bg-[#FFD966] text-black font-medium rounded-md transition-colors">
                View Orders
              </button>
              <Link 
                href="/profile" 
                className="w-full py-2 px-4 bg-[#E6B325] hover:bg-[#FFD966] text-black font-medium rounded-md transition-colors text-center"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 