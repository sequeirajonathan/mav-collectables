import { NextResponse } from 'next/server';
import { createSquareClient } from '@lib/square';
import { serializeBigIntValues } from '@utils/serialization';

export async function GET() {
  try {
    const squareClient = createSquareClient();
    
    // Check if we're in sandbox environment
    const isSandbox = process.env.SQUARE_ENVIRONMENT === 'sandbox';
    
    if (isSandbox) {
      console.log('Sandbox environment detected, using fallback merchant settings');
      
      // Return fallback settings for sandbox environment with all payment methods enabled for testing
      const fallbackSettings = {
        success: true,
        merchantSettings: {
          paymentMethods: {
            applePay: true, // Enable Apple Pay in sandbox for testing
            googlePay: true, // Enable Google Pay in sandbox for testing
            cashApp: true, // Enable Cash App in sandbox for testing
            afterpayClearpay: {
              enabled: true, // Enable Afterpay in sandbox for testing
              orderEligibilityRange: {
                min: { amount: 1000, currency: "USD" },
                max: { amount: 200000, currency: "USD" }
              },
              itemEligibilityRange: {
                min: { amount: 1000, currency: "USD" },
                max: { amount: 200000, currency: "USD" }
              }
            }
          },
          updatedAt: new Date().toISOString()
        }
      };
      
      return NextResponse.json(JSON.parse(JSON.stringify(fallbackSettings, serializeBigIntValues)), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // For production, try to retrieve actual merchant settings
    console.log('Production environment detected, retrieving merchant settings from Square');
    const response = await squareClient.checkout.retrieveMerchantSettings();
    
    if (!response.merchantSettings) {
      console.error('No merchant settings returned from Square API');
      return NextResponse.json({ error: 'Failed to retrieve merchant settings' }, { status: 500 });
    }

    // Extract payment methods configuration
    const paymentMethods = response.merchantSettings.paymentMethods || {};
    
    // Format the response to include only enabled payment methods
    const enabledPaymentMethods = {
      applePay: paymentMethods.applePay?.enabled || false,
      googlePay: paymentMethods.googlePay?.enabled || false,
      cashApp: paymentMethods.cashApp?.enabled || false,
      afterpayClearpay: {
        enabled: paymentMethods.afterpayClearpay?.enabled || false,
        orderEligibilityRange: paymentMethods.afterpayClearpay?.orderEligibilityRange || null,
        itemEligibilityRange: paymentMethods.afterpayClearpay?.itemEligibilityRange || null
      }
    };

    return NextResponse.json(JSON.parse(JSON.stringify({
      success: true,
      merchantSettings: {
        paymentMethods: enabledPaymentMethods,
        updatedAt: response.merchantSettings.updatedAt
      }
    }, serializeBigIntValues)), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error retrieving merchant settings:', error);
    
    // If we're in sandbox and the API call failed, return fallback settings
    if (process.env.SQUARE_ENVIRONMENT === 'sandbox') {
      console.log('Sandbox API call failed, returning fallback settings');
      
      const fallbackSettings = {
        success: true,
        merchantSettings: {
          paymentMethods: {
            applePay: true,
            googlePay: true,
            cashApp: true,
            afterpayClearpay: {
              enabled: true,
              orderEligibilityRange: {
                min: { amount: 1000, currency: "USD" },
                max: { amount: 200000, currency: "USD" }
              },
              itemEligibilityRange: {
                min: { amount: 1000, currency: "USD" },
                max: { amount: 200000, currency: "USD" }
              }
            }
          },
          updatedAt: new Date().toISOString()
        }
      };
      
      return NextResponse.json(JSON.parse(JSON.stringify(fallbackSettings, serializeBigIntValues)), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    return NextResponse.json({ 
      error: 'Failed to retrieve merchant settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 