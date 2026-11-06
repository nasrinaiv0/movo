/**
 * Largest publicly traded companies by market cap, source snapshot on 2026-11-06.
 * Source: https://companiesmarketcap.com/
 * The order is historical, not a real-time ranking. The app does not scrape this site.
 * Quotes are intentionally fetched on demand through MOVO's licensed market-data service.
 * Company logos are fetched from Google favicon by official company website domain.
 */
export const TOP_GLOBAL_STOCKS_SNAPSHOT = '2026-11-06';
export const TOP_GLOBAL_STOCKS_SOURCE = 'https://companiesmarketcap.com/';
export const TOP_GLOBAL_STOCKS = [
  {
    "symbol": "AAPL",
    "name": "Apple",
    "domain": "apple.com",
    "rank": 1
  },
  {
    "symbol": "NVDA",
    "name": "NVIDIA",
    "domain": "nvidia.com",
    "rank": 2
  },
  {
    "symbol": "MSFT",
    "name": "Microsoft",
    "domain": "microsoft.com",
    "rank": 3
  },
  {
    "symbol": "GOOG",
    "name": "Alphabet (Google)",
    "domain": "google.com",
    "rank": 4
  },
  {
    "symbol": "AMZN",
    "name": "Amazon",
    "domain": "amazon.com",
    "rank": 5
  },
  {
    "symbol": "TSM",
    "name": "TSMC",
    "domain": "tsmc.com",
    "rank": 6
  },
  {
    "symbol": "2222.SR",
    "name": "Saudi Aramco",
    "domain": "aramco.com",
    "rank": 7
  },
  {
    "symbol": "SPCX",
    "name": "SpaceX",
    "domain": "spacex.com",
    "rank": 8
  },
  {
    "symbol": "META",
    "name": "Meta Platforms (Facebook)",
    "domain": "meta.com",
    "rank": 9
  },
  {
    "symbol": "AVGO",
    "name": "Broadcom",
    "domain": "broadcom.com",
    "rank": 10
  },
  {
    "symbol": "TSLA",
    "name": "Tesla",
    "domain": "tesla.com",
    "rank": 11
  },
  {
    "symbol": "BRK-B",
    "name": "Berkshire Hathaway",
    "domain": "berkshirehathaway.com",
    "rank": 12
  },
  {
    "symbol": "LLY",
    "name": "Eli Lilly",
    "domain": "lilly.com",
    "rank": 13
  },
  {
    "symbol": "WMT",
    "name": "Walmart",
    "domain": "walmart.com",
    "rank": 14
  },
  {
    "symbol": "005930.KS",
    "name": "Samsung",
    "domain": "samsung.com",
    "rank": 15
  },
  {
    "symbol": "JPM",
    "name": "JPMorgan Chase",
    "domain": "jpmorganchase.com",
    "rank": 16
  },
  {
    "symbol": "V",
    "name": "Visa",
    "domain": "visa.com",
    "rank": 17
  },
  {
    "symbol": "MU",
    "name": "Micron Technology",
    "domain": "micron.com",
    "rank": 18
  },
  {
    "symbol": "XOM",
    "name": "Exxon Mobil",
    "domain": "exxonmobil.com",
    "rank": 19
  },
  {
    "symbol": "AMD",
    "name": "AMD",
    "domain": "amd.com",
    "rank": 20
  },
  {
    "symbol": "JNJ",
    "name": "Johnson & Johnson",
    "domain": "jnj.com",
    "rank": 21
  },
  {
    "symbol": "000660.KS",
    "name": "SK Hynix",
    "domain": "skhynix.com",
    "rank": 22
  },
  {
    "symbol": "MA",
    "name": "Mastercard",
    "domain": "mastercard.com",
    "rank": 23
  },
  {
    "symbol": "ASML",
    "name": "ASML",
    "domain": "asml.com",
    "rank": 24
  },
  {
    "symbol": "ABBV",
    "name": "AbbVie",
    "domain": "abbvie.com",
    "rank": 25
  },
  {
    "symbol": "TCEHY",
    "name": "Tencent",
    "domain": "tencent.com",
    "rank": 26
  },
  {
    "symbol": "COST",
    "name": "Costco",
    "domain": "costco.com",
    "rank": 27
  },
  {
    "symbol": "601939.SS",
    "name": "China Construction Bank",
    "domain": "ccb.com",
    "rank": 28
  },
  {
    "symbol": "688825.SS",
    "name": "CXMT",
    "domain": "cxmt.com",
    "rank": 29
  },
  {
    "symbol": "CVX",
    "name": "Chevron",
    "domain": "chevron.com",
    "rank": 30
  },
  {
    "symbol": "KO",
    "name": "Coca-Cola",
    "domain": "coca-colacompany.com",
    "rank": 31
  },
  {
    "symbol": "PG",
    "name": "Procter & Gamble",
    "domain": "pg.com",
    "rank": 32
  },
  {
    "symbol": "RO.SW",
    "name": "Roche",
    "domain": "roche.com",
    "rank": 33
  },
  {
    "symbol": "601288.SS",
    "name": "Agricultural Bank of China",
    "domain": "abchina.com",
    "rank": 34
  },
  {
    "symbol": "CSCO",
    "name": "Cisco",
    "domain": "cisco.com",
    "rank": 35
  },
  {
    "symbol": "PLTR",
    "name": "Palantir",
    "domain": "palantir.com",
    "rank": 36
  },
  {
    "symbol": "MRK",
    "name": "Merck",
    "domain": "merck.com",
    "rank": 37
  },
  {
    "symbol": "1398.HK",
    "name": "ICBC",
    "domain": "icbc.com.cn",
    "rank": 38
  },
  {
    "symbol": "ORCL",
    "name": "Oracle",
    "domain": "oracle.com",
    "rank": 39
  },
  {
    "symbol": "UNH",
    "name": "UnitedHealth",
    "domain": "unitedhealthgroup.com",
    "rank": 40
  },
  {
    "symbol": "HD",
    "name": "Home Depot",
    "domain": "homedepot.com",
    "rank": 41
  },
  {
    "symbol": "BAC",
    "name": "Bank of America",
    "domain": "bankofamerica.com",
    "rank": 42
  },
  {
    "symbol": "601988.SS",
    "name": "Bank of China",
    "domain": "boc.cn",
    "rank": 43
  },
  {
    "symbol": "GE",
    "name": "General Electric",
    "domain": "ge.com",
    "rank": 44
  },
  {
    "symbol": "PM",
    "name": "Philip Morris International",
    "domain": "pmi.com",
    "rank": 45
  },
  {
    "symbol": "NVS",
    "name": "Novartis",
    "domain": "novartis.com",
    "rank": 46
  },
  {
    "symbol": "HSBC",
    "name": "HSBC",
    "domain": "hsbc.com",
    "rank": 47
  },
  {
    "symbol": "AZN",
    "name": "AstraZeneca",
    "domain": "astrazeneca.com",
    "rank": 48
  },
  {
    "symbol": "MS",
    "name": "Morgan Stanley",
    "domain": "morganstanley.com",
    "rank": 49
  },
  {
    "symbol": "SHEL",
    "name": "Shell",
    "domain": "shell.com",
    "rank": 50
  },
  {
    "symbol": "RY",
    "name": "Royal Bank Of Canada",
    "domain": "rbc.com",
    "rank": 51
  },
  {
    "symbol": "SAP",
    "name": "SAP",
    "domain": "sap.com",
    "rank": 52
  },
  {
    "symbol": "INTC",
    "name": "Intel",
    "domain": "intel.com",
    "rank": 53
  },
  {
    "symbol": "NFLX",
    "name": "Netflix",
    "domain": "netflix.com",
    "rank": 54
  },
  {
    "symbol": "OR.PA",
    "name": "L'Oréal",
    "domain": "loreal.com",
    "rank": 55
  },
  {
    "symbol": "NESN.SW",
    "name": "Nestlé",
    "domain": "nestle.com",
    "rank": 56
  },
  {
    "symbol": "600519.SS",
    "name": "Kweichow Moutai",
    "domain": "moutaichina.com",
    "rank": 57
  },
  {
    "symbol": "BABA",
    "name": "Alibaba",
    "domain": "alibaba.com",
    "rank": 58
  },
  {
    "symbol": "RTX",
    "name": "RTX",
    "domain": "rtx.com",
    "rank": 59
  },
  {
    "symbol": "PANW",
    "name": "Palo Alto Networks",
    "domain": "paloaltonetworks.com",
    "rank": 60
  },
  {
    "symbol": "TM",
    "name": "Toyota",
    "domain": "global.toyota",
    "rank": 61
  },
  {
    "symbol": "WFC",
    "name": "Wells Fargo",
    "domain": "wellsfargo.com",
    "rank": 62
  },
  {
    "symbol": "TXN",
    "name": "Texas Instruments",
    "domain": "ti.com",
    "rank": 63
  },
  {
    "symbol": "AMAT",
    "name": "Applied Materials",
    "domain": "appliedmaterials.com",
    "rank": 64
  },
  {
    "symbol": "CAT",
    "name": "Caterpillar",
    "domain": "caterpillar.com",
    "rank": 65
  },
  {
    "symbol": "TMO",
    "name": "Thermo Fisher Scientific",
    "domain": "thermofisher.com",
    "rank": 66
  },
  {
    "symbol": "GS",
    "name": "Goldman Sachs",
    "domain": "goldmansachs.com",
    "rank": 67
  },
  {
    "symbol": "AMGN",
    "name": "Amgen",
    "domain": "amgen.com",
    "rank": 68
  },
  {
    "symbol": "0857.HK",
    "name": "PetroChina",
    "domain": "petrochina.com.cn",
    "rank": 69
  },
  {
    "symbol": "LIN",
    "name": "Linde",
    "domain": "linde.com",
    "rank": 70
  },
  {
    "symbol": "MUFG",
    "name": "Mitsubishi UFJ Financial",
    "domain": "mufg.jp",
    "rank": 71
  },
  {
    "symbol": "SIE.DE",
    "name": "Siemens",
    "domain": "siemens.com",
    "rank": 72
  },
  {
    "symbol": "IBM",
    "name": "IBM",
    "domain": "ibm.com",
    "rank": 73
  },
  {
    "symbol": "MC.PA",
    "name": "LVMH",
    "domain": "lvmh.com",
    "rank": 74
  },
  {
    "symbol": "LRCX",
    "name": "Lam Research",
    "domain": "lamresearch.com",
    "rank": 75
  },
  {
    "symbol": "0941.HK",
    "name": "China Mobile",
    "domain": "chinamobileltd.com",
    "rank": 76
  },
  {
    "symbol": "CRWD",
    "name": "CrowdStrike",
    "domain": "crowdstrike.com",
    "rank": 77
  },
  {
    "symbol": "AXP",
    "name": "American Express",
    "domain": "americanexpress.com",
    "rank": 78
  },
  {
    "symbol": "ITX.MC",
    "name": "Inditex",
    "domain": "inditex.com",
    "rank": 79
  },
  {
    "symbol": "GILD",
    "name": "Gilead Sciences",
    "domain": "gilead.com",
    "rank": 80
  },
  {
    "symbol": "GEV",
    "name": "GE Vernova",
    "domain": "gevernova.com",
    "rank": 81
  },
  {
    "symbol": "DIS",
    "name": "Walt Disney",
    "domain": "disney.com",
    "rank": 82
  },
  {
    "symbol": "DELL",
    "name": "Dell",
    "domain": "dell.com",
    "rank": 83
  },
  {
    "symbol": "ANET",
    "name": "Arista Networks",
    "domain": "arista.com",
    "rank": 84
  },
  {
    "symbol": "TD",
    "name": "Toronto Dominion Bank",
    "domain": "td.com",
    "rank": 85
  },
  {
    "symbol": "BHP",
    "name": "BHP Group",
    "domain": "bhp.com",
    "rank": 86
  },
  {
    "symbol": "ALV.DE",
    "name": "Allianz SE",
    "domain": "allianz.com",
    "rank": 87
  },
  {
    "symbol": "CBA.AX",
    "name": "Commonwealth Bank",
    "domain": "commbank.com.au",
    "rank": 88
  },
  {
    "symbol": "ABT",
    "name": "Abbott Laboratories",
    "domain": "abbott.com",
    "rank": 89
  },
  {
    "symbol": "MCD",
    "name": "McDonald",
    "domain": "mcdonalds.com",
    "rank": 90
  },
  {
    "symbol": "IHC.AE",
    "name": "International Holding Company",
    "domain": "ihcuae.com",
    "rank": 91
  },
  {
    "symbol": "C",
    "name": "Citigroup",
    "domain": "citigroup.com",
    "rank": 92
  },
  {
    "symbol": "TTE",
    "name": "TotalEnergies",
    "domain": "totalenergies.com",
    "rank": 93
  },
  {
    "symbol": "PEP",
    "name": "Pepsico",
    "domain": "pepsico.com",
    "rank": 94
  },
  {
    "symbol": "VZ",
    "name": "Verizon",
    "domain": "verizon.com",
    "rank": 95
  },
  {
    "symbol": "BLK",
    "name": "BlackRock",
    "domain": "blackrock.com",
    "rank": 96
  },
  {
    "symbol": "RELIANCE.NS",
    "name": "Reliance Industries",
    "domain": "ril.com",
    "rank": 97
  },
  {
    "symbol": "PRX.AS",
    "name": "Prosus",
    "domain": "prosus.com",
    "rank": 98
  },
  {
    "symbol": "NEE",
    "name": "Nextera Energy",
    "domain": "nexteraenergy.com",
    "rank": 99
  },
  {
    "symbol": "SHOP",
    "name": "Shopify",
    "domain": "shopify.com",
    "rank": 100
  }
];
