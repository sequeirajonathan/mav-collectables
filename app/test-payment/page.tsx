"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { ACTIVE_LOCATIONS } from "@const/locations";

interface SquareCard {
  tokenize(): Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
  attach(selector: string): Promise<void>;
}

export default function TestPaymentPage() {
  const [card, setCard] = useState<SquareCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeSquare = async () => {
      try {
        if (!window.Square) {
          setError('Square SDK not loaded');
          setIsLoading(false);
          return;
        }

        const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
        console.log('appId', appId);
        if (!appId) {
          setError('Square App ID not configured');
          setIsLoading(false);
          return;
        }

        const locationId = ACTIVE_LOCATIONS.brickAndMortar.id;
        const payments = window.Square.payments(appId, locationId);
        
        const cardComponent = await payments.card({
          style: {
            '.input-container': {
              'border-radius': '8px',
              'border': '1px solid #374151',
              'background-color': '#1f2937',
              'color': '#ffffff',
              'font-size': '16px',
              'padding': '12px',
              'margin-bottom': '8px'
            },
            '.input-container.is-focus': {
              'border-color': '#E6B325',
              'box-shadow': '0 0 0 2px rgba(230, 179, 37, 0.2)'
            }
          }
        });

        await cardComponent.attach('#card-container');
        setCard(cardComponent);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Square:', err);
        setError('Failed to initialize Square payment form');
        setIsLoading(false);
      }
    };

    initializeSquare();
  }, []);

  const handleTestPayment = async () => {
    if (!card) return;

    try {
      const result = await card.tokenize();
      console.log('Tokenization result:', result);
      
      if (result.status === 'OK') {
        alert('Card tokenization successful! Token: ' + result.token?.substring(0, 20) + '...');
      } else {
        alert('Tokenization failed: ' + result.errors?.[0]?.message);
      }
    } catch (err) {
      console.error('Tokenization error:', err);
      alert('Tokenization error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#E6B325] animate-spin mx-auto mb-4" />
          <p>Loading Square payment form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <p className="text-gray-300">Please check your environment variables and Square configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Square Payment Test</h1>
          <p className="text-gray-300">Test the Square Web Payments SDK integration</p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Test Card Form
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Card Information</label>
              <div id="card-container" ref={cardContainerRef} className="min-h-[200px]"></div>
            </div>

            <Button
              variant="gold"
              className="w-full mt-6"
              onClick={handleTestPayment}
            >
              Test Tokenization
            </Button>
          </div>

          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold mb-2">Test Instructions:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Enter any test card number (e.g., 4111 1111 1111 1111)</li>
              <li>• Use any future expiry date</li>
              <li>• Use any 3-digit CVV</li>
              <li>• Click &quot;Test Tokenization&quot; to verify the SDK works</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 