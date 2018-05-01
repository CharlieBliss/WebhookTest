import request from 'request'
import rp from 'request-promise'
import { jiraRegex } from '../../consts'
import { parseReviews } from '../../helpers/utils'
import Github from '../../helpers/github'
import Tickets from '../../helpers/tickets'

/**
 * Checks the number of reviewers for a Pull Request.
 * Count can be defined in the configuration for each repository.
 *
 * Checks that:
 *	There are AT LEAST `count` reviews
 *	All the most up to date reviews are passing
 *
 * Filters out review comments, only cares about "approved" or "changes requested"
 *
 */
function CheckReviews(payload, event, count = 2) {
	const action = payload.action,
		author = payload.pull_request.user

	const actions = ['opened', 'edited', 'reopened', 'synchronize']

	// We don't want to run this check on things like PR closed
	if (event === 'pull_request' && !actions.includes(action)) {
		return 'Invalid Action'
	}

	const prUrl = payload.pull_request.url,
		sha = payload.pull_request.head.sha

	// Skip PRs that don't need reviews.
	if (
		author.id.toString() === '25992031' // If the PR was opened by the webhook bot, don't require reviews
	) {
		rp(Github.post(`${payload.pull_request.head.repo.url}/statuses/${sha}`, {
			state: 'success',
			description: 'No reviews required',
			context: 'ci/reelio',
		}))
			.then(() => 'Webhook PR') // eslint-disable-line
			.catch(err => (err))

		return 'Webhook PR'
	}

	// Get all reviews for a PR
	rp(Github.get(`${prUrl}/reviews`))
		.then((body) => {
			let reviews = body ? JSON.parse(body) : [],
				approved = []

			// group by author keep latest review
			reviews = parseReviews(reviews)

			// grab only the appoved reviews
			approved = reviews
				.map(r => r.state)
				.filter(r => r.toLowerCase() === 'approved')
			console.log(approved)
			if (
				reviews.length >= count &&
				approved.length >= count
			) {
				if (reviews.length === approved.length) {
					rp(Github.post(`${payload.pull_request.head.repo.url}/statuses/${sha}`, {
						state: 'success',
						description: `At least ${count} reviews, all reviews approved.`,
						context: 'ci/reelio',
					}))
						.then(() => {
							request(Github.post(`${payload.pull_request.issue_url}/labels`, ['approved', '$$qa']))
							request(Github.delete(`${payload.pull_request.issue_url}/labels/%24%24review`))
							request(Github.delete(`${payload.pull_request.issue_url}/labels/changes%20requested`))

							// Move the tickets to "Ready for QA"
							const tickets = payload.pull_request.body.match(jiraRegex) || []
							Tickets.updateTickets(tickets, payload)
						})
				}

				// PR has outstanding requests for changes
				if (reviews.length !== approved.length) {
					request(Github.post(`${payload.pull_request.head.repo.url}/statuses/${sha}`, {
						state: 'failure',
						description: 'This PR is blocked from merging due to a pending request for changes.',
						context: 'ci/reelio',
					}))

					request(Github.post(`${payload.pull_request.issue_url}/labels`, ['$$review']))
					request(Github.delete(`${payload.pull_request.issue_url}/labels/%24%24qa`))
					request(Github.delete(`${payload.pull_request.issue_url}/labels/approved`))
				}

			} else {
				const additional = count - approved.length
				console.log('payload', payload, additional)
				request(Github.post(`${payload.pull_request.head.repo.url}/statuses/${sha}`, {
					state: 'failure',
					description: `This PR requires ${additional} more approved review${additional > 1 ? 's' : ''} to be merged.`,
					context: 'ci/reelio',
				}))
				request(Github.post(`${payload.pull_request.issue_url}/labels`, ['$$review']))
				request(Github.delete(`${payload.pull_request.issue_url}/labels/%24%24qa`))
				request(Github.delete(`${payload.pull_request.issue_url}/labels/approved`))
			}
		})
}

export default CheckReviews
