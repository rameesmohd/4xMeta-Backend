const axios = require('axios');
const NodeCache = require('node-cache');
const data = require('../../assets/countryCodes')
const countryCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

const fetchCountryList = async (req, res) => {
  // Check if the countries data is already cached
  const cachedData = countryCache.get('countries');
  
  if (cachedData) {
    // Return cached data if it exists
    return res.json(cachedData);
  }

  try {

    // Cache the sorted data for future use
    countryCache.set('countries', data);

    res.status(200).json({data});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch country data' });
  }
};
module.exports = {
  fetchCountryList,
};
