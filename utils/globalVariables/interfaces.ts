interface dataIPQueryJSON {
  ip: string | null;
  isp: {
    asn: string;
    org: string;
    isp: string;
  };
  location: {
    country: string;
    country_code: string;
    city: string;
    state: string;
    zipcode: string;
    latitude: number;
    longitude: number;
    timezone: string;
    localtime: string;
  };
  risk: {
    is_mobile: boolean;
    is_vpn: boolean;
    is_tor: boolean;
    is_proxy: boolean;
    is_datacenter: boolean;
    risk_score: number;
  };
}

interface dataIP_APIJSON {
  status: string;
  continent: string;
  continentCode: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  district: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  offset: number;
  currency: string;
  isp: string;
  org: string;
  as: string;
  asname: string;
  reverse: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
  query: string;
}

export { dataIPQueryJSON, dataIP_APIJSON };
