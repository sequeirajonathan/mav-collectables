import { Shippo } from "shippo";
import { SquareCustomerAddress } from "@interfaces/square";

function createShippoClient() {
  return new Shippo({
    apiKeyHeader: process.env.NEXT_PUBLIC_SHIPPO_ACCESS_TOKEN!,
  });
}

interface ShippoAddressValidationResult {
  isValid: boolean;
  messages: Array<{
    code: string;
    source: string;
    text: string;
    type: string;
  }>;
  validatedAddress?: SquareCustomerAddress;
}

export async function validateAddress(address: SquareCustomerAddress): Promise<ShippoAddressValidationResult> {
  const shippo = createShippoClient();

  try {
    console.log('Validating address with Shippo:', address);
    
    // Convert Square address format to Shippo format
    const shippoAddress = {
      name: "", // Optional for validation
      street1: address.addressLine1,
      street2: address.addressLine2,
      city: address.locality,
      state: address.administrativeDistrictLevel1,
      zip: address.postalCode,
      country: address.country,
      validate: true,
    };

    console.log('Shippo address format:', shippoAddress);

    const result = await shippo.addresses.create(shippoAddress);
    console.log('Shippo validation result:', result);

    // Check if Shippo provided suggestions or corrections
    const hasSuggestions = result.validationResults?.messages?.some(msg => 
      msg.type === 'address_suggestion' || msg.type === 'info'
    );

    // Convert Shippo response back to Square format
    const validatedAddress: SquareCustomerAddress = {
      addressLine1: result.street1 || address.addressLine1,
      addressLine2: result.street2 || address.addressLine2,
      locality: result.city || address.locality,
      administrativeDistrictLevel1: result.state || address.administrativeDistrictLevel1,
      postalCode: result.zip || address.postalCode,
      country: result.country || address.country,
    };

    const isValid = result.validationResults?.isValid ?? false;
    const messages = (result.validationResults?.messages || []).map(msg => ({
      code: msg.code || 'UNKNOWN',
      source: msg.source || 'Shippo',
      text: msg.text || 'Unknown validation message',
      type: msg.type || 'error'
    }));

    console.log('Validation result:', { 
      isValid, 
      messages, 
      validatedAddress,
      hasSuggestions,
      originalState: address.administrativeDistrictLevel1,
      suggestedState: result.state
    });

    // If Shippo suggests a different state, prioritize that suggestion
    if (result.state && result.state !== address.administrativeDistrictLevel1) {
      console.log(`State correction: ${address.administrativeDistrictLevel1} -> ${result.state}`);
      validatedAddress.administrativeDistrictLevel1 = result.state;
      
      // Add a specific message about the state correction
      messages.push({
        code: 'STATE_CORRECTION',
        source: 'Shippo',
        text: `State corrected from ${address.administrativeDistrictLevel1} to ${result.state}`,
        type: 'info'
      });
    }

    return {
      isValid: Boolean(isValid || hasSuggestions), // Ensure boolean type
      messages,
      validatedAddress: (isValid || hasSuggestions) ? validatedAddress : undefined,
    };
  } catch (error) {
    console.error('Error validating address with Shippo:', error);
    return {
      isValid: false,
      messages: [{
        code: 'VALIDATION_ERROR',
        source: 'Shippo',
        text: 'Failed to validate address',
        type: 'error'
      }]
    };
  }
}
