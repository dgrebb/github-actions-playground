const core = require('@actions/core')
const { fetchAsync } = require('utils')

/**
 * Creates headers for Jira API requests.
 * @param {string} user - The Jira API user.
 * @param {string} token - The Jira API token.
 * @returns {Object} - The headers object.
 */
function createJiraHeaders(user, token) {
  return {
    Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
}

/**
 * Main function to run the GitHub Action.
 */
async function run() {
  core.debug('Setting up workflow values...')
  const JIRA_URL = core.getInput('JIRA_URL', { required: false })
  const JIRA_API_URL = core.getInput('JIRA_API_URL', { required: true })
  const JIRA_API_TOKEN = core.getInput('JIRA_API_TOKEN', { required: true })
  const JIRA_API_USER = core.getInput('JIRA_API_USER', { required: true })
  const JIRA_PROJECT_KEYS = core
    .getInput('JIRA_PROJECT_KEYS', { required: true })
    .split(',')
    .map(key => key.trim())

  const headers = createJiraHeaders(JIRA_API_USER, JIRA_API_TOKEN)
  let JIRA_PROJECT_NAME
  let JIRA_RELEASE_NAME

  try {
    const JIRA_RELEASE_IDENTIFIER = core.getInput('JIRA_RELEASE_IDENTIFIER', {
      required: true
    })
    const JIRA_RELEASE_DESCRIPTION = core.getInput('JIRA_RELEASE_DESCRIPTION', {
      required: false
    })
    const JIRA_RELEASE_NOW = core.getBooleanInput('JIRA_RELEASE_NOW', {
      required: true
    })

    for (const JIRA_PROJECT_KEY of JIRA_PROJECT_KEYS) {
      // Fetch the Jira project data
      const jiraProjectData = await fetchAsync(
        `${JIRA_API_URL}/project/${JIRA_PROJECT_KEY}`,
        {
          method: 'GET',
          headers
        }
      )

      const JIRA_PROJECT_ID = jiraProjectData.id
      JIRA_PROJECT_NAME = jiraProjectData.name

      core.debug(`Creating Jira Fix Version for ${JIRA_PROJECT_NAME} ...`)

      JIRA_RELEASE_NAME = `${JIRA_PROJECT_KEY}-R${JIRA_RELEASE_IDENTIFIER}`

      // Create Jira version
      const jiraResponse = await fetchAsync(`${JIRA_API_URL}/version`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          archived: false,
          description: JIRA_RELEASE_DESCRIPTION,
          name: JIRA_RELEASE_NAME,
          projectId: JIRA_PROJECT_ID,
          released: JIRA_RELEASE_NOW
        })
      })

      const JIRA_VERSION_ID = jiraResponse.id
      const JIRA_RELEASE_URL = `${JIRA_URL}/projects/${JIRA_PROJECT_KEY}/versions/${JIRA_VERSION_ID}`

      core.summary.addRaw(`## Release Details for ${JIRA_PROJECT_NAME}`, true)
      core.summary.addRaw(
        `- Release: [${JIRA_RELEASE_NAME}](${JIRA_RELEASE_URL})`,
        true
      )
      core.summary.addRaw(
        `- Description: ${JIRA_RELEASE_DESCRIPTION || 'N/A'}`,
        true
      )

      // Set outputs for other workflow steps to use
      core.setOutput('JIRA_RELEASE_NAME', JIRA_RELEASE_NAME)
      core.setOutput('JIRA_VERSION_URL', JIRA_RELEASE_URL)
    }

    core.summary.write({ overwrite: false })
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error('Error message:', error.message)
    if (error.message === '400') {
      core.setFailed(
        `${JIRA_PROJECT_NAME} already has a version named ${JIRA_RELEASE_NAME} `
      )
    } else {
      core.setFailed(`Error: ${error.message}`)
    }
  }
}

module.exports = {
  run
}
