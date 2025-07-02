import { NextRequest, NextResponse } from 'next/server';
import { validateAddress } from '@lib/shippo';
import { SquareCustomerAddress } from '@interfaces/square';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const validationResult = await validateAddress(address as SquareCustomerAddress);

    console.log('Shippo validation endpoint result:', {
      isValid: validationResult.isValid,
      hasValidatedAddress: !!validationResult.validatedAddress,
      messageCount: validationResult.messages.length,
      messages: validationResult.messages
    });

    if (!validationResult.isValid && validationResult.messages.length > 0) {
      // Check if we have a validated address despite validation issues
      if (validationResult.validatedAddress) {
        // Return address suggestion response format with the corrected address
        return NextResponse.json({
          status: 'address_suggestion',
          originalAddress: address,
          suggestedAddress: validationResult.validatedAddress,
          messages: validationResult.messages
        });
      }
      
      // Return address suggestion response format
      return NextResponse.json({
        status: 'address_suggestion',
        originalAddress: address,
        suggestedAddress: address, // Keep original if no validated address
        messages: validationResult.messages
      });
    }

    // Address is valid, return success
    return NextResponse.json({
      status: 'valid',
      address: validationResult.validatedAddress || address
    });

  } catch (error) {
    console.error('Error in Shippo validation endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to validate address' },
      { status: 500 }
    );
  }
} 