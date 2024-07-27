const core = require('@actions/core')

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
    const JIRA_PROJECT_ID = fetch(
      `${JIRA_API_URL}/project/${JIRA_PROJECT_KEY}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${JIRA_API_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    )

    core.summary.addRaw('# Initial Vars')

    core.summary.addList([
      `JIRA_URL: ${JIRA_URL}`,
      `JIRA_API_URL: ${JIRA_API_URL}`,
      `JIRA_PROJECT_KEY: ${JIRA_PROJECT_KEY}`,
      `JIRA_RELEASE_IDENTIFIER: ${JIRA_RELEASE_IDENTIFIER}`,
      `JIRA_PROJECT_ID: ${JIRA_PROJECT_ID}`,
      `JIRA_RELEASE_NOW: ${JIRA_RELEASE_NOW}`
    ])

    core.debug('--- VARIABLES ---')
    core.debug(`JIRA_URL: ${JIRA_URL}`)
    core.debug(`JIRA_API_URL: ${JIRA_API_URL}`)
    core.debug(`JIRA_PROJECT_KEY: ${JIRA_PROJECT_KEY}`)
    core.debug(`JIRA_PROJECT_ID: ${JIRA_PROJECT_ID}`)
    core.debug(`JIRA_RELEASE_IDENTIFIER: ${JIRA_RELEASE_IDENTIFIER}`)
    core.debug(`JIRA_RELEASE_DESCRIPTION: ${JIRA_RELEASE_DESCRIPTION}`)
    core.debug(`JIRA_RELEASE_NOW: ${JIRA_RELEASE_NOW}`)

    core.debug(`Create Jira Fix Version(s) ...`)

    const JIRA_RELEASE_NAME = `${JIRA_PROJECT_KEY}-R${JIRA_RELEASE_IDENTIFIER}`

    const JIRA_VERSION_ID = await fetch(`${JIRA_API_URL}/version`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${JIRA_API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        archived: false,
        description: `${JIRA_RELEASE_DESCRIPTION}`,
        name: `${JIRA_RELEASE_NAME}`,
        projectId: `${JIRA_PROJECT_ID}`,
        released: `${JIRA_RELEASE_NOW} || 'false' }}`
      })
    })

    const VERSION_URL = `${JIRA_URL}/projects/${JIRA_PROJECT_KEY}/versions/${JIRA_VERSION_ID}`

    core.summary.addRaw('# Generated Vars')

    core.summary.addList([
      `VERSION_URL: ${VERSION_URL}`,
      `JIRA_RELEASE_NAME: ${JIRA_RELEASE_NAME}`
    ])

    // Set outputs for other workflow steps to use
    core.setOutput('JIRA_RELEASE_NAME', JIRA_RELEASE_NAME)
    core.setOutput('JIRA_VERSION_URL', VERSION_URL)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
