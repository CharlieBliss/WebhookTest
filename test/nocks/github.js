import nock from 'nock'
import * as payloads from '../payloads/github'

// comments

export const featureBranchComment = () => (
	nock('https://api.github.com')
		.post('/repos/test/test/issues/1/comments')
		.reply(200)
)


export const featurelessComment = () => (
	nock('https://api.github.com')
	.post('/repos/test/test/issues/1/comments',
		{ body: `@Kyle-Mendes - It looks like your branch doesn't contain \`feature-\`.  Are you sure this PR shouldn't be a feature branch?`
		})
	.reply(200)
)

export const ticketlessComment = () => (
	nock('https://api.github.com')
		.post('/repos/test/test/issues/1/comments',
			{
				body: `@Kyle-Mendes - It looks like you didn't include JIRA ticket references in this ticket.  Are you sure you have none to reference?`
			})
		.reply(200)
)

//pulls

export const allPullsSingle = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/pulls')
		.reply(200, payloads.pullRequest.singlePull)
)

export const allPullsMultiple = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/pulls')
		.reply(200, payloads.pullRequest.multiplePulls)
)

export const noOpenPulls = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/pulls?head=schema-test-1&base=feature-test-1&state=open')
		.reply(200, [])
)

export const allOpenPulls = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/pulls?head=schema-test-1&base=feature-test-1&state=open')
		.reply(200, payloads.pullRequest.singlePull)
)

// branches

export const getStagingBranch = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/branches/staging')
		.reply(200, {commit: { sha: '123' }})
)

export const getBlankSchemaBranch = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/branches/schema-test-123')
		.reply(404)
)

export const getSchemaBranch = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/branches/schema-test-123')
		.reply(200)
)

export const getFeatureBranch = () => (
	nock('https://api.github.com')
		.get('/repos/test/test/branches/feature-test-1')
		.reply(200)
)

export const createSchemaBranch = () => (
	nock('https://api.github.com')
		.post('/repos/test/test/git/refs')
		.reply(200)
)

// pushes

// export const
