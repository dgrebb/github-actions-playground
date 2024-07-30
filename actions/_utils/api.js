/**
 * Fetches data from the provided URL with the specified options.
 * Retries on HTTP 429 Too Many Requests with exponential backoff.
 * @param {string} url - The URL to fetch data from.
 * @param {Object} options - The fetch options including method and headers.
 * @param {number} [retries=3] - The number of retries to attempt on 429 responses.
 * @param {number} [initialBackoff=1000] - The initial backoff time in milliseconds.
 * @returns {Promise<Object>} - The response data.
 * @throws Will throw an error if the response is not ok or if retries are exhausted.
 */
async function fetchAsync(url, options, retries = 3, initialBackoff = 1000) {
  let backoff = initialBackoff

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options)

    if (response.ok) {
      return response.json()
    }

    if (response.status === 429 && attempt < retries) {
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoff

      console.warn(
        `HTTP 429 Too Many Requests. Retrying after ${delay}ms... (Attempt ${attempt + 1}/${retries})`
      )
      await new Promise(resolve => setTimeout(resolve, delay))

      backoff *= 2 // Exponential backoff
    } else {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  }

  throw new Error('Maximum retries reached. Request failed.')
}

function errorLogger(errorData) {
  if (Array.isArray(errorData)) {
    errorData.map(error => {
      console.error(`🚦 ----------------- API ERROR ----------------- 🚦`)
      console.table(error)
      console.error(`🚦 ----------------- END ERROR ----------------- 🚦`)
    })
  } else {
    console.info(`🚦 ----------------- API ERROR ----------------- 🚦`)
    console.error(errorData)
    console.info(`🚦 ----------------- END ERROR ----------------- 🚦`)
  }
}

module.exports = { fetchAsync, errorLogger }
