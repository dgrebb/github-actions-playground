const core = require('@actions/core')
const { fetchAsync, errorLogger } = require('utils')

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
  const CONFLUENCE_URL = core.getInput('CONFLUENCE_URL', { required: true })
  const CONFLUENCE_API_URL = core.getInput('CONFLUENCE_API_URL', {
    required: false
  })
  const CONFLUENCE_API_PATH = core.getInput('CONFLUENCE_API_PATH', {
    required: true
  })
  const CONFLUENCE_API_KEY = core.getInput('CONFLUENCE_API_KEY', {
    required: true
  })
  const CONFLUENCE_API_USER = core.getInput('CONFLUENCE_API_USER', {
    required: true
  })
  const JIRA_RELEASE_NAMES = core.getInput('JIRA_RELEASE_NAMES', {
    required: false
  })
  const JIRA_RELEASE_LINKS = core.getInput('JIRA_RELEASE_LINKS', {
    required: false
  })
  const RELEASE_PAGE_INCLUDE_JIRA_ISSUES = core.getInput(
    'RELEASE_PAGE_INCLUDE_JIRA_ISSUES',
    {
      required: false
    }
  )

  const headers = createConfluenceHeaders(
    CONFLUENCE_API_USER,
    CONFLUENCE_API_KEY
  )

  let CONFLUENCE_SPACE_NAME
  let CONFLUENCE_SPACE_ID
  let JQL_QUERY
  let suggestedPageTitle

  try {
    const confluenceSpaceData = await fetchAsync(
      `${CONFLUENCE_API_URL ? CONFLUENCE_API_URL : CONFLUENCE_URL}/${CONFLUENCE_API_PATH}/spaces?keys=${CONFLUENCE_SPACE_KEY}`,
      {
        method: 'GET',
        headers,
        redirect: 'follow'
      }
    )

    CONFLUENCE_SPACE_ID = confluenceSpaceData.results[0].id
    CONFLUENCE_SPACE_NAME = confluenceSpaceData.results[0].name

    if (JIRA_RELEASE_NAMES) {
      // TODO: Logic for pages with Jira release inputs
    }

    if (RELEASE_PAGE_INCLUDE_JIRA_ISSUES && JIRA_RELEASE_NAMES) {
      JQL_QUERY = `fixVersion in (${JIRA_RELEASE_NAMES})`
    }

    const requestBody = {
      type: 'long',
      title: CONFLUENCE_PAGE_TITLE,
      space: {
        key: CONFLUENCE_SPACE_KEY
      },
      spaceId: CONFLUENCE_SPACE_ID,
      body: {
        storage: {
          value: `
            <h1>A new Release Page for ${JIRA_RELEASE_NAMES}</h1>
            <p>Body</p>
            <ac:structured-macro ac:name="jira" ac:schema-version="1">
              <ac:parameter ac:name="jqlQuery">${JQL_QUERY}</ac:parameter>
              <ac:parameter ac:name="columns">key,summary,status,assignee</ac:parameter>
            </ac:structured-macro>
          `.trim(),
          representation: 'storage'
        }
      }
    }

    const confluenceResponse = await fetchAsync(
      `${CONFLUENCE_API_URL ? CONFLUENCE_API_URL : CONFLUENCE_URL}/${CONFLUENCE_API_PATH}/pages`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      }
    )

    core.debug(`Creating Release Page under ${CONFLUENCE_SPACE_NAME} ...`)
  } catch (confluenceErrors) {
    errorLogger(confluenceErrors)
    core.setFailed(`Error: ${confluenceErrors.message}`)
  }
  core.summary.write({ overwrite: false })
}

module.exports = {
  run
}
