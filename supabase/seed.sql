-- Seed: 40 Michelin-starred restaurants
-- Emails marked (verified) were confirmed in the master prompt.
-- Others are best-known contact emails — verify each before first send.
-- Run AFTER migrations 001–003.

INSERT INTO restaurants (name, city, country, stars, head_chef, cuisine_style, website_url, careers_email, instagram, notes) VALUES

-- ── COPENHAGEN ──────────────────────────────────────────────────────────────
(
  'Geranium', 'Copenhagen', 'Denmark', 3,
  'Rasmus Kofoed',
  'New Nordic, vegetable-forward',
  'https://geranium.dk',
  'kitchencareers@geranium.dk',    -- verified
  '@restaurantgeranium',
  'World No. 1 2022. Vegetarian tasting menu. Applications via kitchencareers@geranium.dk.'
),
(
  'Alchemist', 'Copenhagen', 'Denmark', 2,
  'Rasmus Munk',
  'Holistic cuisine, theatrical',
  'https://alchemist.dk',
  'kitchen@alchemist.dk',           -- verified
  '@alchemist.dk',
  '50-course holistic experience. Bold and experimental.'
),
(
  'Jordnær', 'Copenhagen', 'Denmark', 3,
  'Eric Vildgaard',
  'New Nordic, seafood-led',
  'https://restaurantjordnaer.dk',
  'info@restaurantjordnaer.dk',     -- provided in brief
  '@restaurantjordnaer',
  'Youngest Danish chef to earn 3 stars. Intimate 20-seat room.'
),
(
  'AOC', 'Copenhagen', 'Denmark', 2,
  'Søren Selin',
  'New Nordic, seasonal',
  'https://restaurantaoc.dk',
  'info@restaurantaoc.dk',          -- verify via website
  '@aoc_restaurant',
  'Located in a 17th century cellar. Strong wine programme.'
),
(
  'Kadeau', 'Copenhagen', 'Denmark', 2,
  'Nicolai Nørregaard',
  'Bornholm terroir, preserved',
  'https://kadeau.dk',
  'info@kadeau.dk',                 -- verify via website
  '@kadeau_dk',
  'Foraging and preservation from Bornholm island. Deeply seasonal.'
),

-- ── SPAIN ───────────────────────────────────────────────────────────────────
(
  'Restaurant Amelia', 'San Sebastián', 'Spain', 2,
  'Paulo Airaudo',
  'French-Japanese, minimalist',
  'https://restaurantamelia.com',
  'careers@pauloairaudo.com',       -- verified
  '@restaurantamelia',
  'Argentine chef, Paris-trained. Franco-Japanese precision.'
),
(
  'Mugaritz', 'Errenteria', 'Spain', 2,
  'Andoni Luis Aduriz',
  'Techno-emotional, boundary-pushing',
  'https://mugaritz.com',
  'info@mugaritz.com',              -- verified
  '@mugaritz',
  'Consistently top 10 World''s 50 Best. Food as thought experiment.'
),
(
  'Disfrutar', 'Barcelona', 'Spain', 3,
  'Oriol Castro, Eduard Xatruch, Mateu Casañas',
  'Avant-garde, playful technique',
  'https://disfrutarbarcelona.com',
  'jobs@disfrutarbarcelona.com',    -- verify via /job-board
  '@disfrutar_barcelona',
  'World No. 2 2024. Former elBulli team. Careers page at /job-board.'
),
(
  'Azurmendi', 'Larrabetzu', 'Spain', 3,
  'Eneko Atxa',
  'Basque, sustainable luxury',
  'https://azurmendi.restaurant',
  'info@azurmendi.restaurant',      -- verify via website
  '@azurmendi_restaurant',
  '3 Michelin + Green star. Greenhouse dining, zero waste focus.'
),
(
  'Asador Etxebarri', 'Atxondo', 'Spain', 1,
  'Victor Arguinzoniz',
  'Live-fire, Basque grill',
  'https://asadoretxebarri.com',
  'info@asadoretxebarri.com',       -- verify via website
  '@asadoretxebarri',
  'Consistently top 5 World''s 50 Best. Fire is the only technique.'
),
(
  'DiverXO', 'Madrid', 'Spain', 3,
  'David Muñoz',
  'Asian-Iberian fusion, theatrical',
  'https://diverxo.com',
  'info@diverxo.com',               -- verify via website
  '@diverxo_madrid',
  'Only 3-star in Madrid. Flying Pig concept. Wildly experimental.'
),
(
  'Quique Dacosta', 'Dénia', 'Spain', 3,
  'Quique Dacosta',
  'Mediterranean avant-garde',
  'https://quiquedacosta.es',
  'info@quiquedacosta.es',          -- verify via website
  '@quiquedacosta',
  'Sea and salt landscapes. Textures of the Mediterranean coast.'
),

-- ── LONDON ──────────────────────────────────────────────────────────────────
(
  'Ikoyi', 'London', 'United Kingdom', 2,
  'Jeremy Chan',
  'West African spice, seasonal British',
  'https://ikoyilondon.com',
  'kitchen@ikoyilondon.com',        -- verified
  '@ikoyilondon',
  'Jeremy Chan''s landmark. Spice and fermentation at the centre.'
),
(
  'The Ledbury', 'London', 'United Kingdom', 3,
  'Brett Graham',
  'Modern British, game and produce',
  'https://theledbury.com',
  'careers@theledbury.com',         -- verified
  '@theledbury',
  'Brett Graham''s Notting Hill institution. Exceptional produce sourcing.'
),
(
  'The Clove Club', 'London', 'United Kingdom', 2,
  'Isaac McHale',
  'Modern British, foraged, fermented',
  'https://thecloveclub.com',
  'careers@thecloveclub.com',       -- verified
  '@thecloveclub',
  'Shoreditch fine dining. Snacks culture. Chef''s table format.'
),
(
  'Core by Clare Smyth', 'London', 'United Kingdom', 3,
  'Clare Smyth',
  'British luxury, potato as protagonist',
  'https://corebyklaresmyth.com',
  'info@corebyklaresmyth.com',      -- verify via website
  '@corebyklaresmyth',
  'Only British female chef with 3 stars. Core Potato is iconic.'
),
(
  'Da Terra', 'London', 'United Kingdom', 2,
  'Rafael Cagali',
  'Brazilian-Italian, tasting menu',
  'https://daterra.co.uk',
  'info@daterra.co.uk',             -- verify via website
  '@daterrarestaurant',
  'Rafael Cagali, ex-elBulli. Personal story through food.'
),
(
  'Brat', 'London', 'United Kingdom', 1,
  'Tomos Parry',
  'Basque-Welsh live fire',
  'https://bratrestaurant.com',
  'info@bratrestaurant.com',        -- verify via website
  '@bratrestaurant',
  'Wood fire and turbot. Basque philosophy in Shoreditch.'
),
(
  'Lyle''s', 'London', 'United Kingdom', 1,
  'James Lowe',
  'Modern British, nose-to-tail, seasonal',
  'https://lyleslondon.com',
  'info@lyleslondon.com',           -- verify via website
  '@lyleslondon',
  'Shoreditch. Whole animal. The platonic ideal of British cooking.'
),
(
  'The Araki', 'London', 'United Kingdom', 3,
  'Mitsuhiro Araki',
  'Edomae sushi',
  'https://the-araki.com',
  'info@the-araki.com',             -- verify via website
  '@thearaki',
  '9-seat counter. Only 3-star sushi outside Japan. Application by form.'
),

-- ── PARIS ───────────────────────────────────────────────────────────────────
(
  'Restaurant David Toutain', 'Paris', 'France', 2,
  'David Toutain',
  'Vegetable-centric, French precision',
  'https://davidtoutain.com',
  'contact@davidtoutain.com',       -- verify via website
  '@davidtoutain',
  'Uddaloc staged here Mar–May 2024. Vegetables as the star, always.'
),
(
  'Septime', 'Paris', 'France', 1,
  'Bertrand Grébaut',
  'Neo-bistro, natural wine, seasonal',
  'https://septime-charonne.fr',
  'contact@septime-charonne.fr',    -- verify via website
  '@septimecharonne',
  'Impossible to book. The defining neo-bistro of its generation.'
),
(
  'Arpège', 'Paris', 'France', 3,
  'Alain Passard',
  'Vegetable haute cuisine',
  'https://alain-passard.com',
  'arpege@alain-passard.com',       -- verify via website
  '@alainpassard',
  'The originator of vegetable-forward fine dining. Three stars since 1996.'
),
(
  'Sur Mesure par Thierry Marx', 'Paris', 'France', 2,
  'Thierry Marx',
  'Molecular French, Zen precision',
  'https://www.mandarinoriental.com/paris/hotel/dining',
  'surmesure@mohg.com',             -- verify via hotel website
  '@thierrymarxofficial',
  'Inside Mandarin Oriental Paris. Molecular + Japanese discipline.'
),
(
  'Saturne', 'Paris', 'France', 1,
  'Sven Chartier',
  'Natural wine, Nordic-French',
  'https://saturne-paris.fr',
  'contact@saturne-paris.fr',       -- verify via website
  '@saturne_paris',
  'Natural wine temple. Nordic influence on French produce.'
),
(
  'Kei', 'Paris', 'France', 2,
  'Kei Kobayashi',
  'Japanese-French fusion',
  'https://restaurant-kei.fr',
  'contact@restaurant-kei.fr',      -- verify via website
  '@restaurantkei',
  'First Japanese chef to earn 2 stars in France. Immaculate technique.'
),

-- ── ITALY ───────────────────────────────────────────────────────────────────
(
  'Osteria Francescana', 'Modena', 'Italy', 3,
  'Massimo Bottura',
  'Italian avant-garde, conceptual',
  'https://osteriafrancescana.it',
  'info@osteriafrancescana.it',     -- verify via website
  '@massimobottura',
  'World No. 1 twice. Bottura''s art-as-food philosophy. Cult status.'
),
(
  'Piazza Duomo', 'Alba', 'Italy', 3,
  'Enrico Crippa',
  'Piedmontese, garden-to-table',
  'https://piazzaduomoalba.it',
  'info@piazzaduomoalba.it',        -- verify via website
  '@piazzaduomoalba',
  'Crippa''s 100-ingredient salad is one of the world''s great dishes.'
),
(
  'Le Calandre', 'Rubano', 'Italy', 3,
  'Massimiliano Alajmo',
  'Italian contemporary, family-rooted',
  'https://alajmo.it',
  'info@alajmo.it',                 -- verify via website
  '@alajmoit',
  'Youngest chef ever to earn 3 Michelin stars (at age 28).'
),
(
  'St. Hubertus', 'San Cassiano', 'Italy', 3,
  'Norbert Niederkofler',
  'Alpine, zero-waste, hyper-local',
  'https://rosalpina.it',
  'info@rosalpina.it',              -- verify via website
  '@norbert_niederkofler',
  'Cook the Mountain philosophy. Dolomites sourcing only.'
),
(
  'Il Luogo di Aimo e Nadia', 'Milan', 'Italy', 2,
  'Alessandro Negrini & Fabio Pisani',
  'Regional Italian, ingredient obsession',
  'https://aimoenadia.com',
  'info@aimoenadia.com',            -- verify via website
  '@aimoenadia',
  '50+ years of excellence. Ingredient quality above all else.'
),

-- ── NORDICS ─────────────────────────────────────────────────────────────────
(
  'Maaemo', 'Oslo', 'Norway', 3,
  'Esben Holmboe Bang',
  'New Nordic, biodynamic Norwegian',
  'https://maaemo.no',
  'post@maaemo.no',                 -- verify via website
  '@maaemoresaurant',
  'First Nordic 3-star. Entirely Norwegian ingredients. Seasonal extremes.'
),
(
  'Frantzén', 'Stockholm', 'Sweden', 3,
  'Björn Frantzén',
  'Nordic-Japanese fusion, luxury',
  'https://restaurantfrantzen.com',
  'info@restaurantfrantzen.com',    -- verify via website
  '@bjornfrantzen',
  'Only 3-star in Sweden. Nordic technique, Japanese discipline.'
),

-- ── USA ─────────────────────────────────────────────────────────────────────
(
  'Eleven Madison Park', 'New York', 'United States', 3,
  'Daniel Humm',
  'Plant-based fine dining, luxury',
  'https://elevenmadisonpark.com',
  'careers@elevenmadisonpark.com',  -- verify via website
  '@elevenmadisonpark',
  'World No. 1 2017. Went fully plant-based 2021. Iconic EMP.'
),
(
  'Per Se', 'New York', 'United States', 3,
  'Thomas Keller',
  'French-American, classical luxury',
  'https://thomaskeller.com/per-se',
  'persecareers@thomaskellercooks.com', -- verify via website
  '@persenyc',
  'Thomas Keller''s NYC outpost. Mirror of The French Laundry.'
),
(
  'SingleThread', 'Healdsburg', 'United States', 3,
  'Kyle Connaughton',
  'Japanese kaiseki, California terroir',
  'https://singlethreadfarms.com',
  'apply@singlethreadfarms.com',    -- verify via website
  '@singlethreadfarms',
  'Farm-inn-restaurant. Kyle''s Japanese kaiseki meets Sonoma agriculture.'
),
(
  'Atomix', 'New York', 'United States', 2,
  'Junghyun Park',
  'Korean fine dining, fermentation',
  'https://atomixnyc.com',
  'info@atomixnyc.com',             -- verify via website
  '@atomixnyc',
  'Chef J.Ryu Park. Korean culinary heritage, no shortcuts.'
),

-- ── TOKYO ───────────────────────────────────────────────────────────────────
(
  'Narisawa', 'Tokyo', 'Japan', 2,
  'Yoshihiro Narisawa',
  'Innovative Satoyama, French-Japanese',
  'https://narisawa.co.jp',
  'info@narisawa.co.jp',            -- verify via website
  '@narisawa_official',
  'Satoyama (village mountain) cuisine. Sustainability pioneer in Japan.'
),
(
  'Den', 'Tokyo', 'Japan', 2,
  'Zaiyu Hasegawa',
  'Japanese creative, playful fine dining',
  'https://jimbochoden.com',
  'info@jimbochoden.com',           -- verify via website
  '@den_tokyo',
  'World''s 50 Best top 10. Hasegawa''s humour and precision. DEN''S salad card.'
);
