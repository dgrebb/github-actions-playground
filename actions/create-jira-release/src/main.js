const core = require('@actions/core')

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
          headers: {
            Authorization: `Basic ${Buffer.from(`${JIRA_API_USER}:${JIRA_API_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      )

      const JIRA_PROJECT_ID = jiraProjectData.id

      core.debug(`Create Jira Fix Version for ${JIRA_PROJECT_KEY} ...`)

      const JIRA_RELEASE_NAME = `${JIRA_PROJECT_KEY}-R${JIRA_RELEASE_IDENTIFIER}`

      const jiraResponse = await fetchAsync(`${JIRA_API_URL}/version`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${JIRA_API_USER}:${JIRA_API_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
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

      core.summary.addRaw(`# Release Details for ${JIRA_PROJECT_KEY}`, true)
      core.summary.addRaw(
        `- Release: [${JIRA_RELEASE_NAME}](${JIRA_RELEASE_URL})`,
        true
      )
      core.summary.addRaw(`- Description: ${JIRA_RELEASE_DESCRIPTION}`, true)

      // Set outputs for other workflow steps to use
      core.setOutput('JIRA_RELEASE_NAME', JIRA_RELEASE_NAME)
      core.setOutput('JIRA_VERSION_URL', JIRA_RELEASE_URL)
    }

    core.summary.write({ overwrite: false })
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.log('message:', error.message, '- end')
    if (error.message === '400') {
      core.setFailed(
        `That version exists for one of the projects: ${JIRA_PROJECT_KEYS}`
      )
    } else {
      core.setFailed(error.message)
    }
  }
}

async function fetchAsync(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(response.status)
  const data = await response.json()
  return data
}

module.exports = {
  run
}
