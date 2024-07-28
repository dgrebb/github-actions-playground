const core = require('@actions/core')
const { fetchAsync } = require('utils')

/**
 * Creates headers for Jira API requests.
 * @param {string} user - The Jira API user.
 * @param {string} token - The Jira API token.
 * @returns {Object} - The headers object.
 */
function createConfluenceHeaders(user, token) {
  return {
    Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
}

/**
 * Increments the numeric version at the end of the identifier.
 * @param {string} identifier - The current identifier, e.g., "R24.07.27.07".
 * @returns {string} - The new incremented identifier, e.g., "R24.07.27.08".
 */
function incrementIdentifier(identifier) {
  const parts = identifier.split('.')
  const lastPart = parts.pop()

  const incrementedPart = (parseInt(lastPart, 10) + 1)
    .toString()
    .padStart(lastPart.length, '0')
  parts.push(incrementedPart)

  return parts.join('.')
}

/**
 * Main function to run the GitHub Action.
 */
async function run() {
  core.debug('Setting up workflow values...')
  const CONFLUENCE_SPACE_KEY = core.getInput('CONFLUENCE_SPACE_KEY', {
    required: true
  })
  const CONFLUENCE_PAGE_TITLE = core.getInput('CONFLUENCE_PAGE_TITLE', {
    required: true
  })
  const CONFLUENCE_URL = core.getInput('CONFLUENCE_URL', { required: false })
  const CONFLUENCE_API_URL = core.getInput('CONFLUENCE_API_URL', {
    required: true
  })
  const CONFLUENCE_API_PAGE_PATH = core.getInput('CONFLUENCE_API_PAGE_PATH', {
    required: true
  })
  const CONFLUENCE_API_SPACE_PATH = core.getInput('CONFLUENCE_API_SPACE_PATH', {
    required: true
  })
  const CONFLUENCE_API_TOKEN = core.getInput('CONFLUENCE_API_TOKEN', {
    required: true
  })
  const CONFLUENCE_API_USER = core.getInput('CONFLUENCE_API_USERNAME', {
    required: true
  })

  const headers = createConfluenceHeaders(
    CONFLUENCE_API_USER,
    CONFLUENCE_API_TOKEN
  )
  let CONFLUENCE_SPACE_NAME
  let CONFLUENCE_SPACE_ID
  let suggestedIdentifier

  try {
    // Fetch Confluence Space data
    const confluenceSpaceData = await fetchAsync(
      `${CONFLUENCE_URL}/${CONFLUENCE_API_SPACE_PATH}/${CONFLUENCE_SPACE_KEY}`,
      {
        method: 'GET',
        headers
      }
    )

    CONFLUENCE_SPACE_ID = confluenceSpaceData.id
    CONFLUENCE_SPACE_NAME = confluenceSpaceData.name

    const jiraResponse = await fetchAsync(
      `${CONFLUENCE_URL}/${CONFLUENCE_API_PAGE_PATH}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'long',
          title: CONFLUENCE_PAGE_TITLE,
          space: {
            key: CONFLUENCE_SPACE_KEY
          },
          spaceId: CONFLUENCE_SPACE_ID,
          body: {
            storage: {
              value: '<h1>heres the page</h1>',
              representation: 'storage'
            }
          }
        })
      }
    )

    core.debug(`Creating Release Page under ${CONFLUENCE_SPACE_NAME} ...`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error('Error message:', error.message)
    core.setFailed(`Error: ${error.message}`)
  }
  core.summary.write({ overwrite: false })
}

module.exports = {
  run
}
