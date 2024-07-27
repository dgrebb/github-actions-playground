const core = require('@actions/core')

// TODO: This must be configured as a shared resource with pnpm workspaces

const fetchAsync = async (url, options) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(response.status)
  const data = await response.json()
  // only proceed once second promise is resolved
  return data
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    core.debug(`Setting up workflow values ...`)
    const JIRA_URL = core.getInput('JIRA_URL', { required: false })
    const JIRA_API_URL = core.getInput('JIRA_API_URL', { required: true })
    const JIRA_API_TOKEN = core.getInput('JIRA_API_TOKEN', {
      required: true
    })
    const JIRA_API_USER = core.getInput('JIRA_API_USER', {
      required: true
    })
    const JIRA_PROJECT_KEY = core.getInput('JIRA_PROJECT_KEY', {
      required: true
    })
    const JIRA_RELEASE_IDENTIFIER = core.getInput('JIRA_RELEASE_IDENTIFIER', {
      required: true
    })
    const JIRA_RELEASE_DESCRIPTION = core.getInput('JIRA_RELEASE_DESCRIPTION', {
      required: true
    })
    const JIRA_RELEASE_NOW = core.getInput('JIRA_RELEASE_NOW', {
      required: true
    })
    // const JIRA_PROJECT_ID = 'hamburger'
    const jiraProjectData = await fetchAsync(
      `${JIRA_API_URL}/project/${JIRA_PROJECT_KEY}`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Basic ${Buffer.from(`${JIRA_API_USER}:${JIRA_API_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        })
      }
    )
    const JIRA_PROJECT_ID = jiraProjectData.id

    core.debug(`Create Jira Fix Version(s) ...`)

    const JIRA_RELEASE_NAME = `${JIRA_PROJECT_KEY}-R${JIRA_RELEASE_IDENTIFIER}`

    const jiraResponse = await fetchAsync(`${JIRA_API_URL}/version`, {
      method: 'POST',
      headers: new Headers({
        Authorization: `Basic ${Buffer.from(`${JIRA_API_USER}:${JIRA_API_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }),
      body: JSON.stringify({
        archived: false,
        description: JIRA_RELEASE_DESCRIPTION,
        name: JIRA_RELEASE_NAME,
        projectId: JIRA_PROJECT_ID,
        released: JIRA_RELEASE_NOW || false
      })
    })
    const JIRA_VERSION_ID = jiraResponse.id

    const JIRA_RELEASE_URL = `${JIRA_URL}/projects/${JIRA_PROJECT_KEY}/versions/${JIRA_VERSION_ID}`

    /**
     * NOTE: Read more about this fun API
     * @see https://github.com/actions/toolkit/blob/main/packages/core/README.md#populating-job-summary
     */
    core.summary.addRaw('# Generated Vars', true)
    core.summary.addRaw(
      `- Release: [${JIRA_RELEASE_NAME}](${JIRA_RELEASE_URL})`,
      true
    )
    core.summary.addRaw(`- Description: ${JIRA_RELEASE_DESCRIPTION}`, true)

    core.summary.write({ overwrite: true })

    // Set outputs for other workflow steps to use
    core.setOutput('JIRA_RELEASE_NAME', JIRA_RELEASE_NAME)
    core.setOutput('JIRA_VERSION_URL', JIRA_RELEASE_URL)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
