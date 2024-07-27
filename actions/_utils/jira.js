/**
 * Fetches data from the provided URL with the specified options.
 * @param {string} url - The URL to fetch data from.
 * @param {Object} options - The fetch options including method and headers.
 * @returns {Promise<Object>} - The response data.
 * @throws Will throw an error if the response is not ok.
 */
async function fetchAsync(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(response.status)
  return response.json()
}

module.exports = { fetchAsync }
