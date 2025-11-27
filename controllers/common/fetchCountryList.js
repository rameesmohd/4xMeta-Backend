const axios = require('axios');
const NodeCache = require('node-cache');
const data = require('../../assets/countryCodes')
const allCountries = require('../../assets/countryCodes')
const countryCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// const fetchCountryList = async (req, res) => {
//   // Check if the countries data is already cached
//   const cachedData = countryCache.get('countries');
  
//   if (cachedData) {
//     // Return cached data if it exists
//     return res.json(cachedData);
//   }

//   try {

//     // Cache the sorted data for future use
//     countryCache.set('countries', data);

//     res.status(200).json({data});
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Failed to fetch country data' });
//   }
// };

const fetchCountryList = async (req, res) => {
  try {
    // 1. Try cache
    const cached = countryCache.get("countries");
    if (cached) {
      return res.status(200).json(cached);   // always array
    }

    // 2. Build minimal list from full dataset
    const formatted = allCountries
      .map((country) => ({
        name: country.name.common,
        code: country.cca2,
        dialCode: country.idd?.root
          ? country.idd.root + (country.idd.suffixes?.[0] || "")
          : null,
        flag: country.flag, // emoji
      }))
      .filter((c) => c.dialCode) // drop N/A
      .sort((a, b) => a.name.localeCompare(b.name)); // A–Z

    // 3. Cache it
    countryCache.set("countries", formatted);

    // 4. Return array
    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Failed to fetch country data:", error);
    return res.status(500).json({ error: "Failed to fetch country data" });
  }
};

module.exports = {
  fetchCountryList,
};
