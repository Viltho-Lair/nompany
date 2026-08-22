// Curated major cities per country (ISO code → city list) for the questionnaire
// Country → City selector. Countries not in the map fall back to a free-typed
// city; even covered countries offer an "Other" free-type option. Focused on
// nompany's markets (KSA + GCC + MENA) with major global markets covered.
export const CITIES = {
  SA: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran", "Taif", "Tabuk", "Buraidah", "Khamis Mushait", "Abha", "Hail", "Najran", "Jubail", "Yanbu", "Al Ahsa", "Jazan", "Qatif"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
  QA: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor", "Lusail", "Umm Salal"],
  KW: ["Kuwait City", "Al Ahmadi", "Hawalli", "Al Farwaniyah", "Al Jahra", "Salmiya"],
  BH: ["Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town", "Sitra"],
  OM: ["Muscat", "Seeb", "Salalah", "Sohar", "Nizwa", "Sur", "Ibri"],
  EG: ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez", "Mansoura", "Tanta", "Luxor", "Aswan"],
  JO: ["Amman", "Zarqa", "Irbid", "Aqaba", "Russeifa", "Madaba"],
  LB: ["Beirut", "Tripoli", "Sidon", "Tyre", "Jounieh", "Zahle"],
  IQ: ["Baghdad", "Basra", "Mosul", "Erbil", "Najaf", "Karbala", "Kirkuk", "Sulaymaniyah"],
  SY: ["Damascus", "Aleppo", "Homs", "Latakia", "Hama", "Tartus"],
  YE: ["Sanaa", "Aden", "Taiz", "Al Hudaydah", "Mukalla", "Ibb"],
  PS: ["Gaza", "Hebron", "Nablus", "Ramallah", "Bethlehem", "Jenin"],
  TR: ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep"],
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Francisco", "Austin", "Seattle", "Boston", "Miami"],
  GB: ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Bristol", "Edinburgh", "Sheffield", "Cardiff"],
  IN: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Surat"],
  PK: ["Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Islamabad", "Multan", "Peshawar", "Quetta"],
  DE: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Bordeaux"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Bilbao"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen"],
  CN: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Hangzhou", "Wuhan", "Xi'an"],
  JP: ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto"],
  CA: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra"],
  MA: ["Casablanca", "Rabat", "Marrakesh", "Fes", "Tangier", "Agadir", "Meknes"],
  DZ: ["Algiers", "Oran", "Constantine", "Annaba", "Blida", "Batna"],
  TN: ["Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès"],
  NG: ["Lagos", "Kano", "Ibadan", "Abuja", "Port Harcourt", "Benin City"],
  ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein"],
  ID: ["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar"],
  MY: ["Kuala Lumpur", "George Town", "Ipoh", "Johor Bahru", "Malacca", "Kuching"],
  PH: ["Manila", "Quezon City", "Davao", "Cebu City", "Zamboanga", "Taguig"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte"],
};

// Cities for a country ISO code, or [] when we don't curate that country.
export function citiesFor(code: unknown): string[] {
  const table: Record<string, string[]> = CITIES;
  return table[String(code || "").toUpperCase()] || [];
}
