/**
 * Fetches data from the provided URL with the specified options.
 * @param {string} url - The URL to fetch data from.
 * @param {Object} options - The fetch options including method and headers.
 * @returns {Promise<Object>} - The response data.
 * @throws Will throw an error if the response is not ok.
 */
async function fetchAsync(url, options) {
  const response = await fetch(url, options)
  console.log('🚀 ~ fetchAsync ~ response:', response)
  if (!response.ok) throw new Error(response.status)
  return response.json()
}

function errorLogger(errorData) {
  if (Array.isArray(errorData)) {
    errorData.map(error => {
      console.error(`----------------- API ERROR -----------------`)
      console.table(error)
      console.error(`----------------- END ERROR -----------------`)
    })
  } else {
    console.info(`----------------- API ERROR -----------------`)
    console.error(errorData)
    console.info(`----------------- END ERROR -----------------`)
  }
}

module.exports = { fetchAsync, errorLogger }
