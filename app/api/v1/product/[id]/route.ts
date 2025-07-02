import { NextResponse } from "next/server";
import { createSquareClient } from "@lib/square";
import { serializeBigIntValues } from "@utils/serialization";
import { normalizeProductResponse } from "@utils/square";
import { ItemVariationObject } from "@interfaces";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[PRODUCT API] Fetching product with ID:', id);
    
    if (!id) {
      console.log('[PRODUCT API] No ID provided');
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const client = createSquareClient();
    const locationId = process.env.SQUARE_LOCATION_ID || "LTZNXWZDB0FH9";

    // Get catalog object
    console.log('[PRODUCT API] Calling Square API for object:', id);
    const catalogResponse = await client.catalog.object.get({
      objectId: id,
      includeRelatedObjects: true,
    });

    console.log('[PRODUCT API] Square API response:', {
      hasObject: !!catalogResponse.object,
      objectType: catalogResponse.object?.type,
      objectId: catalogResponse.object?.id
    });

    if (!catalogResponse.object) {
      console.log('[PRODUCT API] No object found in Square response');
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // If we got a variation, fetch the parent item
    if (catalogResponse.object?.type === 'ITEM_VARIATION') {
      console.log('[PRODUCT API] Got variation, fetching parent item');
      const parentItemId = (catalogResponse.object as ItemVariationObject).itemVariationData?.itemId;
      if (parentItemId) {
        console.log('[PRODUCT API] Fetching parent item:', parentItemId);
        const parentResponse = await client.catalog.object.get({
          objectId: parentItemId,
          includeRelatedObjects: true,
        });
        if (parentResponse.object) {
          catalogResponse.object = parentResponse.object;
          catalogResponse.relatedObjects = parentResponse.relatedObjects;
          console.log('[PRODUCT API] Successfully fetched parent item');
        }
      }
    }

    // Get all variation IDs from the item
    const variationIds = catalogResponse.object?.type === 'ITEM' 
      ? (catalogResponse.object.itemData?.variations ?? [])
          .map(v => v.id)
          .filter((id): id is string => id !== undefined)
      : [id];

    console.log('[PRODUCT API] Variation IDs:', variationIds);

    // Get inventory counts for all variations
    const inventoryResponse = await client.inventory.batchGetCounts({
      catalogObjectIds: variationIds,
      locationIds: [locationId],
    });

    console.log('[PRODUCT API] Inventory response counts:', inventoryResponse.data?.length);

    // Normalize the response
    const normalizedProduct = normalizeProductResponse(
      catalogResponse,
      {
        counts: inventoryResponse.data ?? [],
      },
      locationId
    );

    console.log('[PRODUCT API] Successfully normalized product:', normalizedProduct.id);

    return NextResponse.json(
      JSON.parse(JSON.stringify(normalizedProduct, serializeBigIntValues))
    );
  } catch (error) {
    console.error("[PRODUCT API] Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
