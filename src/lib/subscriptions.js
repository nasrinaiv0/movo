/*
 * Subscription tracker: a catalog of common services, renewal-date maths and spending summaries.
 * Dates are calendar days ('YYYY-MM-DD'). Monthly and yearly plans keep their original day of the month, so a plan
 * that started on the 31st renews on the last day of shorter months and returns to the 31st afterwards.
 */
export const CYCLES = [['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Every 3 months'], ['yearly', 'Yearly']];
export const SUB_CATEGORIES = ['Social media & messaging', 'Entertainment', 'Music', 'AI Tools', 'Developer', 'Productivity', 'Design', 'Cloud storage', 'Gaming', 'Security & VPN', 'Education', 'Health', 'Food & delivery', 'Restaurants & cafés', 'Laundry & cleaning', 'Transport & mobility', 'Utilities & bills', 'Insurance', 'Pets', 'Travel', 'Shopping', 'Phone & internet', 'News', 'Other'];

/*
 * name, category, brand colour, Simple Icons slug for the official mark ('' = initials), region ('' = global, 'US', 'PH'),
 * official website (source of the bundled logo, see scripts/fetch-brand-logos.js).
 * Marks are trademarks of their owners, shown only to identify each service (see BRAND_NOTICE in the UI).
 */
export const CATALOG = [
  [
    "Facebook",
    "Social media & messaging",
    "#0866ff",
    "",
    "",
    "facebook.com"
  ],
  [
    "Instagram",
    "Social media & messaging",
    "#e1306c",
    "",
    "",
    "instagram.com"
  ],
  [
    "WhatsApp",
    "Social media & messaging",
    "#25d366",
    "",
    "",
    "whatsapp.com"
  ],
  [
    "Messenger",
    "Social media & messaging",
    "#0866ff",
    "",
    "",
    "messenger.com"
  ],
  [
    "TikTok",
    "Social media & messaging",
    "#111111",
    "",
    "",
    "tiktok.com"
  ],
  [
    "Snapchat+",
    "Social media & messaging",
    "#fffc00",
    "",
    "",
    "snapchat.com"
  ],
  [
    "LinkedIn Premium",
    "Social media & messaging",
    "#0a66c2",
    "",
    "",
    "linkedin.com"
  ],
  [
    "Telegram Premium",
    "Social media & messaging",
    "#26a5e4",
    "telegram",
    "",
    "telegram.org"
  ],
  [
    "Discord Nitro",
    "Social media & messaging",
    "#5865f2",
    "discord",
    "",
    "discord.com"
  ],
  [
    "X Premium",
    "Social media & messaging",
    "#000000",
    "x",
    "",
    "x.com"
  ],
  [
    "Reddit Premium",
    "Social media & messaging",
    "#ff4500",
    "",
    "",
    "reddit.com"
  ],
  [
    "Pinterest Premium",
    "Social media & messaging",
    "#e60023",
    "",
    "",
    "pinterest.com"
  ],
  [
    "Netflix",
    "Entertainment",
    "#e50914",
    "netflix",
    "",
    "netflix.com"
  ],
  [
    "YouTube Premium",
    "Entertainment",
    "#ff0000",
    "youtube",
    "",
    "youtube.com"
  ],
  [
    "Disney+",
    "Entertainment",
    "#113ccf",
    "",
    "",
    "disneyplus.com"
  ],
  [
    "Prime Video",
    "Entertainment",
    "#1a98ff",
    "",
    "",
    "primevideo.com"
  ],
  [
    "HBO Max",
    "Entertainment",
    "#002be7",
    "hbomax",
    "",
    "hbomax.com"
  ],
  [
    "Apple TV+",
    "Entertainment",
    "#111111",
    "appletv",
    "",
    "tv.apple.com"
  ],
  [
    "Crunchyroll",
    "Entertainment",
    "#f47521",
    "crunchyroll",
    "",
    "crunchyroll.com"
  ],
  [
    "Paramount+",
    "Entertainment",
    "#0064ff",
    "paramountplus",
    "US",
    "paramountplus.com"
  ],
  [
    "Hulu",
    "Entertainment",
    "#1ce783",
    "",
    "US",
    "hulu.com"
  ],
  [
    "Peacock",
    "Entertainment",
    "#111111",
    "",
    "US",
    "peacocktv.com"
  ],
  [
    "ESPN+",
    "Entertainment",
    "#e2231a",
    "",
    "US",
    "plus.espn.com"
  ],
  [
    "YouTube TV",
    "Entertainment",
    "#ff0000",
    "youtubetv",
    "US",
    "tv.youtube.com"
  ],
  [
    "Sling TV",
    "Entertainment",
    "#1c75bc",
    "",
    "US",
    "sling.com"
  ],
  [
    "Fubo",
    "Entertainment",
    "#e4002b",
    "fubo",
    "US",
    "fubo.tv"
  ],
  [
    "Starz",
    "Entertainment",
    "#111111",
    "starz",
    "US",
    "starz.com"
  ],
  [
    "MUBI",
    "Entertainment",
    "#001489",
    "mubi",
    "",
    "mubi.com"
  ],
  [
    "DAZN",
    "Entertainment",
    "#0c161c",
    "dazn",
    "",
    "dazn.com"
  ],
  [
    "Plex Pass",
    "Entertainment",
    "#ebaf00",
    "plex",
    "",
    "plex.tv"
  ],
  [
    "Viu",
    "Entertainment",
    "#f5b400",
    "",
    "PH",
    "viu.com"
  ],
  [
    "iWantTFC",
    "Entertainment",
    "#0033a0",
    "",
    "PH",
    "iwanttfc.com"
  ],
  [
    "Vivamax",
    "Entertainment",
    "#c8102e",
    "",
    "PH",
    "vivamax.net"
  ],
  [
    "iQIYI",
    "Entertainment",
    "#00be06",
    "",
    "PH",
    "iq.com"
  ],
  [
    "WeTV",
    "Entertainment",
    "#ff6a00",
    "",
    "PH",
    "wetv.vip"
  ],
  [
    "Bilibili",
    "Entertainment",
    "#00a1d6",
    "bilibili",
    "PH",
    "bilibili.tv"
  ],
  [
    "Cignal Play",
    "Entertainment",
    "#e30613",
    "",
    "PH",
    "cignalplay.com"
  ],
  [
    "Twitch Turbo",
    "Entertainment",
    "#9146ff",
    "twitch",
    "",
    "twitch.tv"
  ],
  [
    "Spotify",
    "Music",
    "#1db954",
    "spotify",
    "",
    "spotify.com"
  ],
  [
    "Apple Music",
    "Music",
    "#fa243c",
    "applemusic",
    "",
    "music.apple.com"
  ],
  [
    "YouTube Music",
    "Music",
    "#ff0000",
    "youtubemusic",
    "",
    "music.youtube.com"
  ],
  [
    "Tidal",
    "Music",
    "#111111",
    "tidal",
    "",
    "tidal.com"
  ],
  [
    "Pandora",
    "Music",
    "#224099",
    "pandora",
    "US",
    "pandora.com"
  ],
  [
    "SiriusXM",
    "Music",
    "#0000eb",
    "",
    "US",
    "siriusxm.com"
  ],
  [
    "Audible",
    "Music",
    "#f8991c",
    "audible",
    "",
    "audible.com"
  ],
  [
    "ChatGPT Plus",
    "AI Tools",
    "#10a37f",
    "",
    "",
    "chatgpt.com"
  ],
  [
    "ChatGPT Go",
    "AI Tools",
    "#10a37f",
    "",
    "",
    "chatgpt.com"
  ],
  [
    "Claude",
    "AI Tools",
    "#d97757",
    "claude",
    "",
    "claude.ai"
  ],
  [
    "Gemini Pro",
    "AI Tools",
    "#8e75b2",
    "googlegemini",
    "",
    "gemini.google.com"
  ],
  [
    "Perplexity Pro",
    "AI Tools",
    "#1fb8cd",
    "perplexity",
    "",
    "perplexity.ai"
  ],
  [
    "Midjourney",
    "AI Tools",
    "#222222",
    "",
    "",
    "midjourney.com"
  ],
  [
    "Grammarly",
    "AI Tools",
    "#027e6f",
    "grammarly",
    "",
    "grammarly.com"
  ],
  [
    "Microsoft Copilot Pro",
    "AI Tools",
    "#0078d4",
    "",
    "",
    "copilot.microsoft.com"
  ],
  [
    "Poe",
    "AI Tools",
    "#5b5bd6",
    "",
    "",
    "poe.com"
  ],
  [
    "ElevenLabs",
    "AI Tools",
    "#111111",
    "",
    "",
    "elevenlabs.io"
  ],
  [
    "GitHub Copilot",
    "Developer",
    "#24292f",
    "githubcopilot",
    "",
    "github.com"
  ],
  [
    "GitHub Pro",
    "Developer",
    "#181717",
    "github",
    "",
    "github.com"
  ],
  [
    "Cursor",
    "Developer",
    "#111111",
    "cursor",
    "",
    "cursor.com"
  ],
  [
    "Vercel Pro",
    "Developer",
    "#000000",
    "vercel",
    "",
    "vercel.com"
  ],
  [
    "Netlify Pro",
    "Developer",
    "#00ad9f",
    "netlify",
    "",
    "netlify.com"
  ],
  [
    "JetBrains",
    "Developer",
    "#000000",
    "jetbrains",
    "",
    "jetbrains.com"
  ],
  [
    "Docker Pro",
    "Developer",
    "#2496ed",
    "docker",
    "",
    "docker.com"
  ],
  [
    "Supabase Pro",
    "Developer",
    "#3fcf8e",
    "supabase",
    "",
    "supabase.com"
  ],
  [
    "Notion",
    "Productivity",
    "#191919",
    "notion",
    "",
    "notion.so"
  ],
  [
    "Microsoft 365",
    "Productivity",
    "#d83b01",
    "",
    "",
    "microsoft365.com"
  ],
  [
    "Slack",
    "Productivity",
    "#4a154b",
    "",
    "",
    "slack.com"
  ],
  [
    "Zoom",
    "Productivity",
    "#0b5cff",
    "zoom",
    "",
    "zoom.us"
  ],
  [
    "Linear",
    "Productivity",
    "#5e6ad2",
    "linear",
    "",
    "linear.app"
  ],
  [
    "Evernote",
    "Productivity",
    "#00a82d",
    "evernote",
    "",
    "evernote.com"
  ],
  [
    "Todoist",
    "Productivity",
    "#e44332",
    "todoist",
    "",
    "todoist.com"
  ],
  [
    "QuickBooks",
    "Productivity",
    "#2ca01c",
    "quickbooks",
    "US",
    "quickbooks.intuit.com"
  ],
  [
    "Mailchimp",
    "Productivity",
    "#241c15",
    "mailchimp",
    "",
    "mailchimp.com"
  ],
  [
    "Figma",
    "Design",
    "#a259ff",
    "figma",
    "",
    "figma.com"
  ],
  [
    "Canva Pro",
    "Design",
    "#00c4cc",
    "",
    "",
    "canva.com"
  ],
  [
    "Adobe Creative Cloud",
    "Design",
    "#da1f26",
    "",
    "",
    "adobe.com"
  ],
  [
    "Google One",
    "Cloud storage",
    "#4285f4",
    "googledrive",
    "",
    "one.google.com"
  ],
  [
    "iCloud+",
    "Cloud storage",
    "#3693f3",
    "icloud",
    "",
    "icloud.com"
  ],
  [
    "Dropbox",
    "Cloud storage",
    "#0061fe",
    "dropbox",
    "",
    "dropbox.com"
  ],
  [
    "Box",
    "Cloud storage",
    "#0061d5",
    "box",
    "",
    "box.com"
  ],
  [
    "Proton",
    "Cloud storage",
    "#6d4aff",
    "proton",
    "",
    "proton.me"
  ],
  [
    "MEGA",
    "Cloud storage",
    "#d9272e",
    "",
    "",
    "mega.io"
  ],
  [
    "1Password",
    "Security & VPN",
    "#3b66bc",
    "1password",
    "",
    "1password.com"
  ],
  [
    "Bitwarden",
    "Security & VPN",
    "#175ddc",
    "bitwarden",
    "",
    "bitwarden.com"
  ],
  [
    "Dashlane",
    "Security & VPN",
    "#0e353d",
    "dashlane",
    "",
    "dashlane.com"
  ],
  [
    "LastPass",
    "Security & VPN",
    "#d32d27",
    "lastpass",
    "",
    "lastpass.com"
  ],
  [
    "NordVPN",
    "Security & VPN",
    "#4687ff",
    "nordvpn",
    "",
    "nordvpn.com"
  ],
  [
    "ExpressVPN",
    "Security & VPN",
    "#da3940",
    "expressvpn",
    "",
    "expressvpn.com"
  ],
  [
    "Surfshark",
    "Security & VPN",
    "#178a9e",
    "surfshark",
    "",
    "surfshark.com"
  ],
  [
    "Proton VPN",
    "Security & VPN",
    "#66deb1",
    "protonvpn",
    "",
    "protonvpn.com"
  ],
  [
    "Ring Protect",
    "Security & VPN",
    "#1c9ad6",
    "ring",
    "US",
    "ring.com"
  ],
  [
    "Apple Fitness+",
    "Health",
    "#fa243c",
    "",
    "",
    "apple.com"
  ],
  [
    "Strava",
    "Health",
    "#fc4c02",
    "strava",
    "",
    "strava.com"
  ],
  [
    "Fitbit Premium",
    "Health",
    "#00b0b9",
    "",
    "",
    "fitbit.com"
  ],
  [
    "MyFitnessPal Premium",
    "Health",
    "#0066ee",
    "",
    "",
    "myfitnesspal.com"
  ],
  [
    "Calm",
    "Health",
    "#5a7b8c",
    "",
    "",
    "calm.com"
  ],
  [
    "Headspace",
    "Health",
    "#f47d31",
    "",
    "",
    "headspace.com"
  ],
  [
    "Laundry service",
    "Laundry & cleaning",
    "#4f83cc",
    "",
    "PH",
    ""
  ],
  [
    "Laundryheap",
    "Laundry & cleaning",
    "#00a3e0",
    "",
    "",
    "laundryheap.com"
  ],
  [
    "Rinse",
    "Laundry & cleaning",
    "#2355d6",
    "",
    "US",
    "rinse.com"
  ],
  [
    "CleanCloud",
    "Laundry & cleaning",
    "#26a69a",
    "",
    "",
    "cleancloudapp.com"
  ],
  [
    "Grab",
    "Transport & mobility",
    "#00b14f",
    "",
    "PH",
    "grab.com"
  ],
  [
    "Angkas",
    "Transport & mobility",
    "#f9c80e",
    "",
    "PH",
    "angkas.com"
  ],
  [
    "JoyRide",
    "Transport & mobility",
    "#ed1c24",
    "",
    "PH",
    "joyride.com.ph"
  ],
  [
    "Move It",
    "Transport & mobility",
    "#f15a24",
    "",
    "PH",
    "moveit.com.ph"
  ],
  [
    "Bolt Plus",
    "Transport & mobility",
    "#34c759",
    "",
    "",
    "bolt.eu"
  ],
  [
    "Lyft Pink",
    "Transport & mobility",
    "#ff00bf",
    "",
    "US",
    "lyft.com"
  ],
  [
    "Meralco",
    "Utilities & bills",
    "#f58220",
    "",
    "PH",
    "meralco.com.ph"
  ],
  [
    "PLDT Home",
    "Utilities & bills",
    "#e31837",
    "",
    "PH",
    "pldthome.com"
  ],
  [
    "Globe One",
    "Utilities & bills",
    "#0070c0",
    "",
    "PH",
    "globe.com.ph"
  ],
  [
    "Converge ICT",
    "Utilities & bills",
    "#f58220",
    "",
    "PH",
    "convergeict.com"
  ],
  [
    "Manila Water",
    "Utilities & bills",
    "#0086c9",
    "",
    "PH",
    "manilawater.com"
  ],
  [
    "Davao Light",
    "Utilities & bills",
    "#f58220",
    "",
    "PH",
    "davaolight.com"
  ],
  [
    "AppleCare+",
    "Insurance",
    "#555555",
    "",
    "",
    "apple.com"
  ],
  [
    "Lemonade",
    "Insurance",
    "#ff0083",
    "",
    "US",
    "lemonade.com"
  ],
  [
    "Geico",
    "Insurance",
    "#00529b",
    "",
    "US",
    "geico.com"
  ],
  [
    "Chewy Autoship",
    "Pets",
    "#1c49c2",
    "",
    "US",
    "chewy.com"
  ],
  [
    "Petco Vital Care",
    "Pets",
    "#001952",
    "",
    "US",
    "petco.com"
  ],
  [
    "AirAsia MOVE",
    "Travel",
    "#ff0000",
    "",
    "PH",
    "airasia.com"
  ],
  [
    "Trip.com",
    "Travel",
    "#287dfa",
    "",
    "",
    "trip.com"
  ],
  [
    "Booking.com",
    "Travel",
    "#003580",
    "",
    "",
    "booking.com"
  ],
  [
    "Airbnb",
    "Travel",
    "#ff5a5f",
    "",
    "",
    "airbnb.com"
  ],
  [
    "Agoda",
    "Travel",
    "#5142ab",
    "",
    "",
    "agoda.com"
  ],
  [
    "Xbox Game Pass",
    "Gaming",
    "#107c10",
    "",
    "",
    "xbox.com"
  ],
  [
    "PlayStation Plus",
    "Gaming",
    "#0070d1",
    "playstation",
    "",
    "playstation.com"
  ],
  [
    "Nintendo Switch Online",
    "Gaming",
    "#e60012",
    "",
    "",
    "nintendo.com"
  ],
  [
    "Apple Arcade",
    "Gaming",
    "#111111",
    "applearcade",
    "",
    "apple.com"
  ],
  [
    "Ubisoft+",
    "Gaming",
    "#000000",
    "ubisoft",
    "",
    "ubisoft.com"
  ],
  [
    "Google Play Pass",
    "Gaming",
    "#414141",
    "googleplay",
    "",
    "play.google.com"
  ],
  [
    "EA Play",
    "Gaming",
    "#ff4747",
    "",
    "",
    "ea.com"
  ],
  [
    "Minecraft Realms",
    "Gaming",
    "#62a44a",
    "",
    "",
    "minecraft.net"
  ],
  [
    "Roblox Premium",
    "Gaming",
    "#111111",
    "",
    "",
    "roblox.com"
  ],
  [
    "GeForce NOW",
    "Gaming",
    "#76b900",
    "",
    "",
    "nvidia.com"
  ],
  [
    "Duolingo Super",
    "Education",
    "#58cc02",
    "duolingo",
    "",
    "duolingo.com"
  ],
  [
    "Coursera Plus",
    "Education",
    "#0056d2",
    "coursera",
    "",
    "coursera.org"
  ],
  [
    "Udemy",
    "Education",
    "#a435f0",
    "udemy",
    "",
    "udemy.com"
  ],
  [
    "Skillshare",
    "Education",
    "#00ff84",
    "skillshare",
    "",
    "skillshare.com"
  ],
  [
    "MasterClass",
    "Education",
    "#111111",
    "",
    "US",
    "masterclass.com"
  ],
  [
    "Medium",
    "Education",
    "#000000",
    "medium",
    "",
    "medium.com"
  ],
  [
    "Patreon",
    "Education",
    "#000000",
    "patreon",
    "",
    "patreon.com"
  ],
  [
    "Peloton",
    "Health",
    "#181a1d",
    "peloton",
    "US",
    "onepeloton.com"
  ],
  [
    "WHOOP",
    "Health",
    "#000000",
    "",
    "US",
    "whoop.com"
  ],
  [
    "Noom",
    "Health",
    "#5e8c31",
    "",
    "US",
    "noom.com"
  ],
  [
    "BetterHelp",
    "Health",
    "#1f8f8a",
    "",
    "US",
    "betterhelp.com"
  ],
  [
    "Planet Fitness",
    "Health",
    "#5c2d91",
    "",
    "US",
    "planetfitness.com"
  ],
  [
    "Anytime Fitness",
    "Health",
    "#5e2d91",
    "",
    "PH",
    "anytimefitness.ph"
  ],
  [
    "Gym membership",
    "Health",
    "#ef6c00",
    "",
    "",
    ""
  ],
  [
    "DoorDash DashPass",
    "Food & delivery",
    "#ff3008",
    "doordash",
    "US",
    "doordash.com"
  ],
  [
    "Uber One",
    "Food & delivery",
    "#000000",
    "uber",
    "",
    "uber.com"
  ],
  [
    "Instacart+",
    "Food & delivery",
    "#43b02a",
    "instacart",
    "US",
    "instacart.com"
  ],
  [
    "Grubhub+",
    "Food & delivery",
    "#ff8000",
    "",
    "US",
    "grubhub.com"
  ],
  [
    "HelloFresh",
    "Food & delivery",
    "#99cc33",
    "hellofresh",
    "US",
    "hellofresh.com"
  ],
  [
    "GrabUnlimited",
    "Food & delivery",
    "#00b14f",
    "grab",
    "PH",
    "grab.com"
  ],
  [
    "foodpanda pandapro",
    "Food & delivery",
    "#d70f64",
    "foodpanda",
    "PH",
    "foodpanda.ph"
  ],
  [
    "Amazon Prime",
    "Shopping",
    "#ff9900",
    "",
    "US",
    "amazon.com"
  ],
  [
    "Walmart+",
    "Shopping",
    "#0071ce",
    "",
    "US",
    "walmart.com"
  ],
  [
    "Costco membership",
    "Shopping",
    "#e31837",
    "",
    "US",
    "costco.com"
  ],
  [
    "Shopee VIP",
    "Shopping",
    "#ee4d2d",
    "shopee",
    "PH",
    "shopee.ph"
  ],
  [
    "LazMall / LazPlus",
    "Shopping",
    "#0f146d",
    "",
    "PH",
    "lazada.com.ph"
  ],
  [
    "The New York Times",
    "News",
    "#000000",
    "newyorktimes",
    "US",
    "nytimes.com"
  ],
  [
    "The Wall Street Journal",
    "News",
    "#0274b6",
    "",
    "US",
    "wsj.com"
  ],
  [
    "The Washington Post",
    "News",
    "#111111",
    "",
    "US",
    "washingtonpost.com"
  ],
  [
    "Inquirer Plus",
    "News",
    "#003b7b",
    "",
    "PH",
    "inquirer.net"
  ],
  [
    "Philstar+",
    "News",
    "#c8102e",
    "",
    "PH",
    "philstar.com"
  ],
  [
    "Verizon",
    "Phone & internet",
    "#cd040b",
    "verizon",
    "US",
    "verizon.com"
  ],
  [
    "T-Mobile",
    "Phone & internet",
    "#e20074",
    "",
    "US",
    "t-mobile.com"
  ],
  [
    "AT&T",
    "Phone & internet",
    "#00a8e0",
    "",
    "US",
    "att.com"
  ],
  [
    "Xfinity",
    "Phone & internet",
    "#6138f5",
    "",
    "US",
    "xfinity.com"
  ],
  [
    "Globe Postpaid",
    "Phone & internet",
    "#0056b8",
    "",
    "PH",
    "globe.com.ph"
  ],
  [
    "Globe At Home",
    "Phone & internet",
    "#0056b8",
    "",
    "PH",
    "globe.com.ph"
  ],
  [
    "Smart Postpaid",
    "Phone & internet",
    "#00a651",
    "",
    "PH",
    "smart.com.ph"
  ],
  [
    "DITO",
    "Phone & internet",
    "#e4002b",
    "",
    "PH",
    "dito.ph"
  ],
  [
    "PLDT Home Fiber",
    "Phone & internet",
    "#e4002b",
    "",
    "PH",
    "pldthome.com"
  ],
  [
    "Converge FiberX",
    "Phone & internet",
    "#5b2c86",
    "",
    "PH",
    "convergeict.com"
  ],
  [
    "Sky Fiber",
    "Phone & internet",
    "#00a3e0",
    "",
    "PH",
    "mysky.com.ph"
  ],
  [
    "Cignal TV",
    "Phone & internet",
    "#e30613",
    "",
    "PH",
    "cignal.tv"
  ],
  [
    "Mobile plan",
    "Phone & internet",
    "#6d4aff",
    "",
    "",
    ""
  ],
  [
    "Home internet",
    "Phone & internet",
    "#0b8fd8",
    "",
    "",
    ""
  ],
  [
    "Jollibee",
    "Restaurants & cafés",
    "#d71920",
    "",
    "PH",
    "jollibee.com.ph"
  ],
  [
    "McDonald’s",
    "Restaurants & cafés",
    "#ffc72c",
    "",
    "",
    "mcdonalds.com"
  ],
  [
    "KFC",
    "Restaurants & cafés",
    "#e4002b",
    "",
    "",
    "kfc.com"
  ],
  [
    "Burger King",
    "Restaurants & cafés",
    "#d62300",
    "",
    "",
    "bk.com"
  ],
  [
    "Wendy’s",
    "Restaurants & cafés",
    "#e2203d",
    "",
    "",
    "wendys.com"
  ],
  [
    "Popeyes",
    "Restaurants & cafés",
    "#f36f21",
    "",
    "",
    "popeyes.com"
  ],
  [
    "Chowking",
    "Restaurants & cafés",
    "#e31b23",
    "",
    "PH",
    "chowking.ph"
  ],
  [
    "Mang Inasal",
    "Restaurants & cafés",
    "#f5a623",
    "",
    "PH",
    "manginasal.ph"
  ],
  [
    "Greenwich",
    "Restaurants & cafés",
    "#78be20",
    "",
    "PH",
    "greenwich.com.ph"
  ],
  [
    "Red Ribbon",
    "Restaurants & cafés",
    "#c8102e",
    "",
    "PH",
    "redribbonbakeshop.com"
  ],
  [
    "Shakey’s",
    "Restaurants & cafés",
    "#d71920",
    "",
    "PH",
    "shakeys.com.ph"
  ],
  [
    "Pizza Hut",
    "Restaurants & cafés",
    "#ee3124",
    "",
    "",
    "pizzahut.com"
  ],
  [
    "Domino’s Pizza",
    "Restaurants & cafés",
    "#006491",
    "",
    "",
    "dominos.com"
  ],
  [
    "Starbucks",
    "Restaurants & cafés",
    "#00704a",
    "",
    "",
    "starbucks.com"
  ],
  [
    "Dunkin’",
    "Restaurants & cafés",
    "#ff671f",
    "",
    "",
    "dunkindonuts.com"
  ],
  [
    "Tim Hortons",
    "Restaurants & cafés",
    "#c8102e",
    "",
    "",
    "timhortons.com"
  ],
  [
    "The Coffee Bean & Tea Leaf",
    "Restaurants & cafés",
    "#5b2c20",
    "",
    "PH",
    "coffeebean.com"
  ],
  [
    "Bo’s Coffee",
    "Restaurants & cafés",
    "#6b4f3a",
    "",
    "PH",
    "boscoffee.com"
  ],
  [
    "Pickup Coffee",
    "Restaurants & cafés",
    "#ffcc00",
    "",
    "PH",
    "pickup-coffee.com"
  ],
  [
    "Zus Coffee",
    "Restaurants & cafés",
    "#173f35",
    "",
    "PH",
    "zuscoffee.com"
  ],
  [
    "Krispy Kreme",
    "Restaurants & cafés",
    "#007a3d",
    "",
    "",
    "krispykreme.com"
  ],
  [
    "Cinnabon",
    "Restaurants & cafés",
    "#003b70",
    "",
    "",
    "cinnabon.com"
  ],
  [
    "Army Navy",
    "Restaurants & cafés",
    "#1c355e",
    "",
    "PH",
    "armynavy.com.ph"
  ],
  [
    "Kenny Rogers Roasters",
    "Restaurants & cafés",
    "#1d4b36",
    "",
    "PH",
    "kennyrogersdelivery.com.ph"
  ],
  [
    "Tokyo Tokyo",
    "Restaurants & cafés",
    "#e31837",
    "",
    "PH",
    "tokyotokyo.com.ph"
  ],
  [
    "Bonchon",
    "Restaurants & cafés",
    "#c8102e",
    "",
    "PH",
    "bonchon.com"
  ],
  [
    "Subway",
    "Restaurants & cafés",
    "#008c45",
    "",
    "",
    "subway.com"
  ],
  [
    "Taco Bell",
    "Restaurants & cafés",
    "#702082",
    "",
    "",
    "tacobell.com"
  ],
  [
    "Chipotle",
    "Restaurants & cafés",
    "#a81612",
    "",
    "",
    "chipotle.com"
  ],
  [
    "Shake Shack",
    "Restaurants & cafés",
    "#006341",
    "",
    "",
    "shakeshack.com"
  ],
  [
    "Five Guys",
    "Restaurants & cafés",
    "#c8102e",
    "",
    "",
    "fiveguys.com"
  ],
  [
    "Chick-fil-A",
    "Restaurants & cafés",
    "#e51636",
    "",
    "",
    "chick-fil-a.com"
  ],
  [
    "Dairy Queen",
    "Restaurants & cafés",
    "#e31837",
    "",
    "",
    "dairyqueen.com"
  ],
  [
    "Panda Express",
    "Restaurants & cafés",
    "#d62300",
    "",
    "",
    "pandaexpress.com"
  ],
  [
    "7-Eleven",
    "Restaurants & cafés",
    "#ed1c24",
    "",
    "PH",
    "7-eleven.com.ph"
  ],
  [
    "Uncle John’s",
    "Restaurants & cafés",
    "#d71920",
    "",
    "PH",
    "unclejohns.ph"
  ],
  [
    "Lawson",
    "Restaurants & cafés",
    "#0068b7",
    "",
    "PH",
    "lawson.com.ph"
  ]
].map(([name, category, color, mark, region, site]) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, category, color, mark, region, site }));

const pad = (n) => String(n).padStart(2, '0');
const parse = (day) => { const [y, m, d] = String(day).split('-').map(Number); return { y, m, d }; };
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const valid = (day) => /^\d{4}-\d{2}-\d{2}$/.test(day || '') && !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
export const toDay = (date) => { const x = new Date(date); return fmt(x.getFullYear(), x.getMonth() + 1, x.getDate()); };
export const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** The n-th billing date after `start` (n = 0 is the start itself). */
export function billingDate(start, cycle, n) {
  const { y, m, d } = parse(start);
  if (cycle === 'weekly') { const t = new Date(Date.UTC(y, m - 1, d + 7 * n)); return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  const months = cycle === 'yearly' ? 12 : cycle === 'quarterly' ? 3 : 1;
  const total = (m - 1) + months * n; const yy = y + Math.floor(total / 12); const mm = (total % 12) + 1;
  return fmt(yy, mm, Math.min(d, daysIn(yy, mm)));
}

/** First billing date on or after `from`, or '' for an invalid or inactive subscription. */
export function nextRenewal(sub, from) {
  if (!sub || sub.status === 'cancelled' || sub.status === 'paused' || !valid(sub.start)) return '';
  const fromDay = toDay(from);
  if (sub.start >= fromDay) return sub.start;
  const approxDays = { weekly: 7, monthly: 30.44, quarterly: 91.31, yearly: 365.25 }[sub.cycle] || 30.44;
  let n = Math.max(0, Math.floor(dayDiff(sub.start, fromDay) / approxDays) - 1);
  let day = billingDate(sub.start, sub.cycle, n);
  while (day < fromDay) { n += 1; day = billingDate(sub.start, sub.cycle, n); }
  return day;
}

/** Every billing date between two days, inclusive. */
export function renewalsBetween(sub, fromDay, toDayStr) {
  const out = []; let day = nextRenewal(sub, `${fromDay}T00:00:00`);
  if (!day) return out;
  let n = 0; const first = day;
  while (day && day <= toDayStr && n < 400) { out.push(day); n += 1; day = billingDate(first, sub.cycle, n); }
  return out;
}

/** Average monthly cost of a subscription in its own currency. */
export function monthlyCost(sub) {
  const amount = Number(sub.amount);
  if (!Number.isFinite(amount) || amount <= 0 || sub.status === 'cancelled' || sub.status === 'paused') return 0;
  return { weekly: amount * 52 / 12, monthly: amount, quarterly: amount / 3, yearly: amount / 12 }[sub.cycle] ?? amount;
}

/** Totals in the home currency (via `toBase`) plus what renews soon. */
export function summarize(subs, ref, toBase = (v) => v) {
  const today = toDay(ref);
  const active = subs.filter(s => s.status !== 'cancelled' && s.status !== 'paused');
  const monthly = active.reduce((s, x) => s + toBase(monthlyCost(x), x.currency), 0);
  const upcoming = active.map(s => ({ ...s, next: nextRenewal(s, ref) })).filter(s => s.next).sort((a, b) => (a.next < b.next ? -1 : a.next > b.next ? 1 : 0));
  const dueSoon = upcoming.filter(s => dayDiff(today, s.next) <= 7);
  const byCategory = {};
  active.forEach(s => { byCategory[s.category || 'Other'] = (byCategory[s.category || 'Other'] || 0) + toBase(monthlyCost(s), s.currency); });
  return {
    monthly, annual: monthly * 12, activeCount: active.length, upcoming, dueSoon,
    dueSoonTotal: dueSoon.reduce((s, x) => s + toBase(Number(x.amount) || 0, x.currency), 0),
    byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
  };
}

export const catalogFor = (name = '') => CATALOG.find(c => c.name.toLowerCase() === String(name).toLowerCase());
