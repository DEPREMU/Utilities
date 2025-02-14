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

export interface ThemeInterface {
  animation: { scale: number };
  colors: {
    backdrop: string;
    background: string;
    elevation: {
      level0: string;
      level1: string;
      level2: string;
      level3: string;
      level4: string;
      level5: string;
    };
    error: string;
    errorContainer: string;
    inverseOnSurface: string;
    inversePrimary: string;
    inverseSurface: string;
    onBackground: string;
    onError: string;
    onErrorContainer: string;
    onPrimary: string;
    onPrimaryContainer: string;
    onSecondary: string;
    onSecondaryContainer: string;
    onSurface: string;
    onSurfaceDisabled: string;
    onSurfaceVariant: string;
    onTertiary: string;
    onTertiaryContainer: string;
    outline: string;
    outlineVariant: string;
    primary: string;
    primaryContainer: string;
    scrim: string;
    secondary: string;
    secondaryContainer: string;
    shadow: string;
    surface: string;
    surfaceDisabled: string;
    surfaceVariant: string;
    tertiary: string;
    tertiaryContainer: string;
  };
  dark: boolean;
  fonts: {
    bodyLarge: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    bodyMedium: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    bodySmall: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    default: { fontFamily: string; fontWeight: string; letterSpacing: number };
    displayLarge: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    displayMedium: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    displaySmall: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    headlineLarge: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    headlineMedium: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    headlineSmall: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    labelLarge: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    labelMedium: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    labelSmall: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    titleLarge: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    titleMedium: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
    titleSmall: {
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      letterSpacing: number;
      lineHeight: number;
    };
  };
  isV3: boolean;
  mode: "adaptive" | "exact";
  roundness: number;
  version: number;
}

export { dataIPQueryJSON, dataIP_APIJSON };
