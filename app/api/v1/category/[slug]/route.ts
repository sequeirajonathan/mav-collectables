import { NextResponse } from "next/server";
import { createSquareClient } from "@lib/square";
import { isCatalogItem, normalizeItemsWithInventory } from "@utils";
import { ACTIVE_LOCATION_IDS } from "@const/locations";
import { CatalogObject } from "@interfaces";

import {
  CATEGORY_MAPPING,
  COLLECTIBLES_MAPPING,
  SUPPLIES_MAPPING,
  CATEGORY_GROUP_SLUGS,
} from "@const/categories";

const ALL_MAPPINGS = [
  ...Object.values(CATEGORY_MAPPING),
  ...Object.values(COLLECTIBLES_MAPPING),
  ...Object.values(SUPPLIES_MAPPING),
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) =>
      setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1))
    );
    return retryWithBackoff(fn, retries - 1);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    // Read query parameters
    const initialCursor = searchParams.get("cursor");
    const sort = searchParams.get("sort") || "name_asc";
    const stock = searchParams.get("stock") || "IN_STOCK";
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const group = searchParams.get("group");

    // Determine categoryIds[] based on slug & group
    let categoryIds: string[] = [];
    if (slug === "tcg") {
      categoryIds = Object.values(CATEGORY_MAPPING).map(
        (cat) => cat.squareCategoryId
      );
    } else if (CATEGORY_GROUP_SLUGS[slug]) {
      categoryIds = CATEGORY_GROUP_SLUGS[slug];
    } else if (group === "TCG" && CATEGORY_MAPPING[slug]) {
      categoryIds = [CATEGORY_MAPPING[slug].squareCategoryId];
    } else if (
      group === "COLLECTIBLES" &&
      COLLECTIBLES_MAPPING[slug]
    ) {
      categoryIds = [COLLECTIBLES_MAPPING[slug].squareCategoryId];
    } else if (
      group === "SUPPLIES" &&
      SUPPLIES_MAPPING[slug]
    ) {
      categoryIds = [SUPPLIES_MAPPING[slug].squareCategoryId];
    } else {
      const match = ALL_MAPPINGS.find((c) => c.slug === slug);
      if (match) {
        categoryIds = [match.squareCategoryId];
      } else {
        return NextResponse.json(
          { error: "Invalid category or group slug" },
          { status: 404 }
        );
      }
    }

    const client = createSquareClient();
    const sortOrder: "ASC" | "DESC" = sort === "name_desc" ? "DESC" : "ASC";

    const collectedItems: Array<ReturnType<
      typeof normalizeItemsWithInventory
    >[0]> = [];
    let cursor: string | null = initialCursor;
    let keepPaging = true;

    // Keep paginating until we have at least `limit` items or run out of pages
    while (collectedItems.length < limit && keepPaging) {
      const searchResponse = await retryWithBackoff(async () => {
        return await client.catalog.search({
          objectTypes: ["ITEM"],
          includeRelatedObjects: true,
          query: {
            setQuery: {
              attributeName: "category_id",
              attributeValues: categoryIds,
            },
            sortedAttributeQuery: {
              attributeName: "name",
              sortOrder,
            },
          },
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
      });

      // Build a flat list of all variation IDs in this page
      const variationIds = (searchResponse.objects ?? [])
        .filter(isCatalogItem)
        .flatMap((item) => item.itemData?.variations?.map((v) => v.id) ?? []);

      // Fetch inventory counts for each variation ID
      const inventoryResponse = await retryWithBackoff(async () => {
        return await client.inventory.batchGetCounts({
          catalogObjectIds: variationIds.filter((id): id is string => typeof id === "string"),
          locationIds: ACTIVE_LOCATION_IDS,
        });
      });

      // Build a { variationId → totalInStock } map
      const inventoryMap = (inventoryResponse.data ?? []).reduce<
        Record<string, number>
      >((acc, c) => {
        if (c.catalogObjectId && c.state === "IN_STOCK") {
          acc[c.catalogObjectId] =
            (acc[c.catalogObjectId] || 0) + parseFloat(c.quantity ?? "0");
        }
        return acc;
      }, {});

      // Attach inventory numbers to each variation in each item
      const itemsWithInventory = (searchResponse.objects ?? [])
        .filter((obj): obj is CatalogObject & { type: "ITEM" } =>
          isCatalogItem(obj)
        )
        .map((item) => ({
          ...item,
          itemData: {
            ...item.itemData,
            variations: item.itemData?.variations?.map((v) => ({
              ...v,
              inventory: v.id ? inventoryMap[v.id] ?? 0 : 0,
            })),
          },
        }));

      // Normalize items (this merges in price, images, etc. from relatedObjects)
      const normalized = normalizeItemsWithInventory(
        itemsWithInventory,
        searchResponse.relatedObjects
      );

      // Split `stock` into an array: e.g. ["IN_STOCK"] or ["IN_STOCK","SOLD_OUT"]
      const stockArray = stock
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      // Filter‐by‐stock:
      const filtered =
        stockArray.length === 1
          ? stockArray[0] === "IN_STOCK"
            ? normalized.filter((i) => !i.soldOut)
            : normalized.filter((i) => i.soldOut)
          : normalized;

      collectedItems.push(...filtered);

      cursor = searchResponse.cursor ?? null;
      keepPaging = Boolean(cursor);
    }

    // Take exactly `limit` items
    const itemsToReturn = collectedItems.slice(0, limit);

    // Only return a `cursor` if there might be more valid items
    const returnCursor =
      cursor && itemsToReturn.length === limit ? cursor : null;

    return NextResponse.json({
      items: itemsToReturn,
      cursor: returnCursor,
    });
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch catalog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}