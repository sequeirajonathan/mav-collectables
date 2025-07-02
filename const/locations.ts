interface Location {
  id: string;
  name: string;
  address: {
    address_line_1: string;
    locality: string;
    administrative_district_level_1: string;
    postal_code: string;
    country: string;
  };
  timezone: string;
  capabilities: string[];
  status: string;
  business_name: string;
  type: string;
  website_url: string;
  business_hours: {
    periods: Array<{
      day_of_week: string;
      start_local_time: string;
      end_local_time: string;
    }>;
  };
  business_email: string;
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Get location ID from environment variable with fallback
const getBrickAndMortarLocationId = () => {
  return process.env.SQUARE_LOCATION_ID || "LTZNXWZDB0FH9";
};

export const ACTIVE_LOCATIONS: Record<string, Location> = {
  brickAndMortar: {
    id: getBrickAndMortarLocationId(),
    name: "Brick & Mortar",
    address: {
      address_line_1: "19786 HWY 105 W STE 190",
      locality: "MONTGOMERY",
      administrative_district_level_1: "TX",
      postal_code: "77356",
      country: "US"
    },
    timezone: "America/Chicago",
    capabilities: [
      "CREDIT_CARD_PROCESSING",
      "AUTOMATIC_TRANSFERS"
    ],
    status: "ACTIVE",
    business_name: "Mav Collectibles",
    type: "PHYSICAL",
    website_url: "MAVCOLLECTIBLES.COM",
    business_hours: {
      periods: [
        {
          day_of_week: "SUN",
          start_local_time: "12:00:00",
          end_local_time: "22:00:00"
        },
        {
          day_of_week: "TUE",
          start_local_time: "12:00:00",
          end_local_time: "21:00:00"
        },
        {
          day_of_week: "WED",
          start_local_time: "12:00:00",
          end_local_time: "21:00:00"
        },
        {
          day_of_week: "THU",
          start_local_time: "12:00:00",
          end_local_time: "21:00:00"
        },
        {
          day_of_week: "FRI",
          start_local_time: "12:00:00",
          end_local_time: "22:00:00"
        },
        {
          day_of_week: "SAT",
          start_local_time: "12:00:00",
          end_local_time: "22:00:00"
        }
      ]
    },
    business_email: "fnrwholesalegoods@gmail.com",
    description: "TCG Hobby Shop & Collectibles",
    coordinates: {
      latitude: 30.3863778,
      longitude: -95.6665075
    }
  }
};

export const ACTIVE_LOCATION_IDS = Object.values(ACTIVE_LOCATIONS).map(location => location.id);

export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
]; 