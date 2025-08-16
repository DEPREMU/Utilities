export type IPQueryISP = {
  asn: string;
  org: string;
  isp: string;
};

export type IPQueryLocation = {
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

export type IPQueryRisk = {
  is_mobile: boolean;
  is_vpn: boolean;
  is_tor: boolean;
  is_proxy: boolean;
  is_datacenter: boolean;
  risk_score: number;
};

export type dataIPQueryJSON = {
  ip: string | null;
  isp: IPQueryISP;
  location: IPQueryLocation;
  risk: IPQueryRisk;
};

export type dataIP_APIJSON = {
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
};
