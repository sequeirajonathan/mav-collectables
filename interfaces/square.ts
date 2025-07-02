import { Square } from "square";

export type EcomVisibility = "UNINDEXED" | "UNAVAILABLE" | "HIDDEN" | "VISIBLE";
export type SortOption = "price_asc" | "price_desc" | "name_asc" | "name_desc";
export type StockOption = "IN_STOCK" | "SOLD_OUT" | "all";
export type SearchCatalogObjectsResponse = Square.SearchCatalogObjectsResponse;
export type CatalogObject = Square.CatalogObject;
export type CatalogObjectItem = Square.CatalogObjectItem;
export type GetCatalogObjectResponse = Square.GetCatalogObjectResponse;
export type InventoryCount = Square.InventoryCount;
export interface NormalizedCatalogItem {
  itemId: string;
  variationId: string;
  name: string;
  description?: string;
  imageIds?: string[];
  imageUrls?: string[];
  sku: string;
  priceAmount: number;
  priceCurrency: string;
  isTaxable: boolean;
  taxIds: string[];
  taxInfo: Array<{
    name: string;
    percentage?: string;
  }>;
  isArchived: boolean;
  updatedAt?: string;
  soldOut: boolean;
  presentAtAllLocations: boolean;
  presentAtLocationIds: string[];
  ecomAvailable: boolean;
  ecomVisibility: EcomVisibility;
  categoryId?: string;
  categoryInfo?: {
    name: string;
  };
  categoryName?: string;
  group?: string;
  inventoryCount?: number;
}

export interface NormalizedCatalogResponse {
  items: NormalizedCatalogItem[];
  cursor?: string;
}

export type ItemVariationObject = Square.CatalogObject & {
  type: "ITEM_VARIATION";
  itemVariationData: Square.CatalogItemVariation;
};

export type ItemObject = Square.CatalogObject & {
  type: "ITEM";
  itemData: Square.CatalogItem & {
    ecom_visibility?: EcomVisibility;
    ecom_available?: boolean;
  };
};

export interface UseCatalogItemsOptions {
  cursor?: string | null;
  group?: string;
}

export interface NormalizedProductResponse {
  id: string;
  name: string;
  description: string;
  descriptionHtml?: string;
  descriptionPlaintext?: string;
  imageIds: string[];
  imageUrls: string[];
  variations: Array<{
    id: string;
    name: string;
    sku: string;
    upc?: string;
    priceAmount: number;
    priceCurrency: string;
    inventoryCount: number;
    soldOut: boolean;
    locationInventory: Array<{
      locationId: string;
      quantity: number;
      state: string;
    }>;
  }>;
  category: {
    id: string;
    name: string;
  };
  taxInfo: Array<{
    id: string;
    name: string;
    percentage: string;
  }>;
  isTaxable: boolean;
  isArchived: boolean;
  ecomAvailable: boolean;
  ecomVisibility: string;
  updatedAt: string;
}

export interface SquareCustomerAddress {
  addressLine1: string;
  addressLine2?: string;
  locality: string;
  administrativeDistrictLevel1: string;
  postalCode: string;
  country: string;
}

export interface SquareCustomer {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  address?: SquareCustomerAddress;
  referenceId?: string;
  preferences?: {
    emailUnsubscribed?: boolean;
  };
  creationSource?: string;
  segmentIds?: string[];
}

export interface UpdateSquareCustomerData {
  customerId: string;
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  address?: SquareCustomerAddress;
  note?: string;
  referenceId?: string;
}
