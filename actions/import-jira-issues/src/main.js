const JIRA_HOST = process.env.JIRA_HOST
const JIRA_PROJECT = process.env.JIRA_PROJECT
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO // repo format: owner/repo
const GITHUB_PROJECT_NUMBER = process.env.GITHUB_PROJECT_NUMBER // GitHub Project Number

// Adjust the status mapping to GitHub project custom fields
const jiraStatusesToGitHubFields = {
  Backlog: 'PENDING',
  Defined: 'DEFINED',
  'In Progress': 'IN_PROGRESS',
  'Ready For Review': 'REVIEW',
  'E2E Testing': 'TESTING',
  Done: 'DONE',
  Accepted: 'ACCEPTED',
  Released: 'RELEASED'
}

/**
 * Fetches data from the provided URL with the specified options.
 * Retries on HTTP 429 Too Many Requests with exponential backoff.
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

// Fetch Jira Issues
async function fetchJiraIssues() {
  const url = `https://${JIRA_HOST}/rest/api/3/search?jql=project=${JIRA_PROJECT}`
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`email:${JIRA_API_TOKEN}`).toString('base64')}`,
      Accept: 'application/json'
    }
  }

  return fetchAsync(url, options)
}

// GitHub GraphQL API to add issues to a GitHub Project
async function addIssueToGitHubProject(issueId, fieldValue) {
  const query = `
    mutation {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: "${GITHUB_PROJECT_NUMBER}",
          itemId: "${issueId}",
          fieldValue: {
            singleSelectOptionId: "${fieldValue}"
          }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `

  const url = `https://api.github.com/graphql`
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  }

  return fetchAsync(url, options)
}

// GitHub API request for creating issues
async function createGitHubIssue(title, body) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/issues`
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      title: title,
      body: body
    })
  }

  return fetchAsync(url, options)
}

// Sync Jira issues to GitHub issues and associate them with the project
async function run() {
  try {
    const jiraIssues = await fetchJiraIssues()

    for (const issue of jiraIssues) {
      const { key, fields } = issue
      const title = `${key}: ${fields.summary}`
      const description = fields.description || 'No description provided.'
      const jiraStatus = fields.status.name

      // Create GitHub issue
      const createdIssue = await createGitHubIssue(title, description)
      const issueId = createdIssue.id

      // Map Jira status to GitHub Project field value and add to project
      const githubFieldValue = jiraStatusesToGitHubFields[jiraStatus]
      if (githubFieldValue) {
        await addIssueToGitHubProject(issueId, githubFieldValue)
        console.log(`Created GitHub issue and added to project: ${key}`)
      } else {
        console.warn(`No matching GitHub status for Jira status: ${jiraStatus}`)
      }
    }
  } catch (error) {
    console.error('Error syncing Jira issues to GitHub:', error)
  }
}

module.exports = {
  run
}
