import request from 'request'
import rp from 'request-promise'

import { jiraRegex, jiraRegexWithDescription, deployRegex, FRONTEND_MEMBERS, TICKET_BASE } from '../../consts'
import { uniqueTicketFilter, wrapJiraTicketsFromArray, checkMergeStatus } from '../../helpers/utils'

import Github from '../../helpers/github'
import Jira from '../../helpers/jira'
import Firebase from '../../helpers/firebase'
import Slack from '../../helpers/slack'
import PullRequestHelper from '../../helpers/pullRequests'
import Tickets from '../../helpers/tickets'

/**
 * Handles a new PR being created.
 *
 * Checks if there are:
 *	Tickets in the body
 *	The Branch has "feature-" in the name
 *
 */
function handleNew(payload, config) {
	// Get the issue, not the PR
	request(Github.get(payload.pull_request.issue_url), (err, res, body) => {
		if (res.statusCode >= 200 && res.statusCode < 300) {
			const labels = JSON.parse(body).labels || []
			const repo = payload.repository.html_url
			const head = payload.pull_request.head.ref,
				prBody = payload.pull_request.body || '',
				tickets = prBody.match(jiraRegex) || [],
				author = payload.pull_request.user

			const responses = []
			const uniqueTickets = tickets.filter(uniqueTicketFilter)

			if (author.id.toString() === '25992031') {
				return 'Devops PR -- Don\'t need to handle'
			}

			// If there aren't any JIRA tickets in the body as well, warn them
			if (
				!tickets.length &&
				!labels.map(l => l.name).includes('$$webhook') &&
				config.opened &&
				(config.opened.enabled || config.opened.tickets)
			) {
				const feedback = `@${payload.pull_request.user.login} - It looks like you didn't include JIRA ticket references in this ticket.  Are you sure you have none to reference?`
				request(Github.post(`${payload.pull_request.issue_url}/comments`, { body: feedback }))
				request(Github.post(`${payload.pull_request.issue_url}/labels`, ['$$ticketless']))

				Firebase.log('github', payload.repository.full_name, 'pull_request', 'ticketless', payload)
			}

			// If the branch isn't a feature branch, ask about it
			if (
				!head.includes('feature-') &&
				!labels.map(l => l.name).includes('$$webhook') &&
				!labels.map(l => l.name).includes('$$featureless') &&
				config.opened &&
				(config.opened.enabled || config.opened.feature)
			) {
				const feedback = `@${payload.pull_request.user.login} - It looks like your branch doesn't contain \`feature-\`.  Are you sure this PR shouldn't be a feature branch?`
				request(Github.post(`${payload.pull_request.issue_url}/comments`, { body: feedback }))
				request(Github.post(`${payload.pull_request.issue_url}/labels`, ['$$featureless']))

				Firebase.log('github', payload.repository.full_name, 'pull_request', 'featureless', payload)
			} else {
				const parsedBranch = head.substr(head.indexOf('-') + 1, head.length)

				// Let the Dev know that there is a feature environment for their PR
				if (config.opened.feature && head.includes('feature-')) {
					const url = config.opened.feature.ticket_url.replace('{{branch}}', parsedBranch).toLowerCase()
					request(Github.post(`${payload.pull_request.issue_url}/comments`, { body: `@${payload.pull_request.user.login} - Thanks for the PR! Your feature branch is now being built, and will be live at [live](${url})` }))
				}

				// Save ticket information
				if (config.opened.enabled || config.opened.tickets) {
					// If tickets are enabled, grab their information and save it to firebase
					Promise.all(uniqueTickets.map(t => rp(Jira.get(`${TICKET_BASE}/${t}`))
						.then((data) => {
							responses.push(JSON.parse(data))
						})))
							.then(() => {
								const formattedTickets = Tickets.formatTicketData(responses, repo)

								Firebase.log('github', payload.repository.full_name, 'reelio_deploy/feature', null, {
									tickets: formattedTickets,
									fixed_count: tickets.filter(uniqueTicketFilter).length,
									environment: parsedBranch,
									target: 'url',
								})
							})

					// If any tickets are "highest" priority, label this PR as "High Priority"
					if (config.high_priority_label) {
						Tickets.setPriority(uniqueTickets, payload.pull_request.issue_url)
					}
				}

				// Move "in progress" tickets to "PR Submitted"
				if (config.opened.transition) {
					uniqueTickets.forEach((ticket) => {
						Tickets.transitionTicket(`${TICKET_BASE}/${ticket}`, 21)
					})
				}
			}

			return 'New PR -- Complete'
		}

		return 'New PR -- Unhandled but requested'
	})
}

/**
 *
 * Handles a PR being merged.
 *
 * If the PR was into staging, either:
 *	1. Creates a new PR from staging --> master to track all tickets for the release
 *	2. Updates an existing PR with the new changes being added.
 *
 *
 * If the PR was into master, hanldes alerting about an upcoming release and logs the release to Firebase
 *
 */
function handleMerge(payload, config) {
	const repo = payload.repository.html_url,
		base = payload.pull_request.base.ref, // target of the original PR
		user = FRONTEND_MEMBERS[payload.pull_request.user.id]

	let labels = [],
		reviews = []

	// Get the issue, not the PR
	request(Github.get(payload.pull_request.issue_url), (err, res, body) => {
		if (res.statusCode >= 200 && res.statusCode < 300) {
			labels = JSON.parse(body).labels || []
		}
		if (
			labels.length &&
			base === 'staging' &&
			config.merged.create
		) {

			const tickets = payload.pull_request.body.match(jiraRegex) || []
			const uniqueTickets = tickets.filter(uniqueTicketFilter)

			Promise.all(uniqueTickets.map(ticket => (wrapJiraTicketsFromArray(ticket)))).then((response) => {
				const namedTickets = response.map(ticket => (
					`[${ticket.ticketNumber.toUpperCase()} :: ${ticket.summary}](https://reelio.atlassian.net/browse/${ticket.ticketNumber.toUpperCase()})`
				))

				const newBody = `### Resolves:\n${namedTickets.join('\n\t')}`
				PullRequestHelper.createNextPullRequest('staging', 'master', payload, newBody, ['$$production'])
			})
		}
	})

	// If the closed PRs target was the master branch, alert QA of impending release
	if (base === 'master' && !config.merged.alert) {
		const tickets = payload.pull_request.body.match(jiraRegexWithDescription) || []
		const uniqueTickets = tickets.filter(uniqueTicketFilter)

		Firebase.log('github', payload.repository.full_name, 'reelio_deploy', null, {
			tickets: uniqueTickets,
			fixed_count: uniqueTickets.length,
			environment: 'production',
		})
	}

	// If the closed PRs target was the master branch, alert QA of impending release
	if (
			base === 'master' &&
			config.merged.alert &&
			config.merged.alert.channel &&
			config.merged.alert.url &&
			config.merged.alert.env
		) {
		const alertConfig = config.merged.alert
		const tickets = payload.pull_request.body.match(jiraRegexWithDescription) || []
		const uniqueTickets = tickets.filter(uniqueTicketFilter)
		const uniqueTicketNumbers = uniqueTickets.map(ticket => (ticket.match(deployRegex)[1]))

		const formattedFixed = uniqueTickets.map((ticket) => {
			const ticketNumber = ticket.match(deployRegex)[1]
			const ticketSummary = ticket.match(deployRegex)[3]
			return `<https://reelio.atlassian.net/browse/${ticketNumber}|${ticketNumber} :: ${ticketSummary}>`
		}).join('\n')

		Slack.slackDeployWarning(payload, formattedFixed, alertConfig.channel, `<${alertConfig.url}|${alertConfig.env}>`)

		const responses = []

		if (uniqueTickets.length < 10) {
				Promise.all(uniqueTicketNumbers.map(t => rp(Jira.get(`${TICKET_BASE}/${t}`)) //eslint-disable-line
					.then((data) => {
						responses.push(JSON.parse(data))
					}),
				)).then(() => {
					const formattedTickets = Tickets.formatTicketData(responses, repo)

					Firebase.log('github', payload.repository.full_name, 'reelio_deploy', null, {
						tickets: formattedTickets,
						fixed_count: uniqueTickets.length,
						environment: alertConfig.env,
						target: alertConfig.url,
					})
				})
		} else {
			Firebase.log('github', payload.repository.full_name, 'reelio_deploy', null, {
				tickets: uniqueTickets,
				fixed_count: uniqueTickets.length,
				environment: alertConfig.env,
				target: alertConfig.url,
			})
		}

	}

	// If there were no requested changes, congratulate the author!
	if (config.merged.congrats) {
		// Get the reviews
		request(Github.get(`${payload.pull_request.url}/reviews`), (err, res, body) => {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				reviews = JSON.parse(body) || []
				reviews = reviews.map(r => r.state)
			}
			// If the PR was merged without any changes requested, :tada: to the dev!
			if (
				!reviews.includes('CHANGES_REQUESTED') &&
				user.slack_id !== 'U28LB0AAH' &&
				payload.pull_request.user.id.toString() !== '25992031'
			) {
				Slack.slackCongrats(payload, user)
				Firebase.log('github', payload.repository.full_name, 'pull_request', 'party_parrot', payload)
			}
		})
	}
	if (config.merged.conflicts) {
		checkMergeStatus(payload)
	}
	return 'Merged!'
}


function PullRequest(payload, config) {

	if (
		(payload.action === 'labeled' || payload.action === 'unlabeled') &&
		config.labels
	) {
		return 'Pull Request -- Labels Handled'
	}

	if (
		payload.action === 'opened' &&
		config.opened
	) {
		return handleNew(payload, config)
	}

	if (
		payload.action === 'closed' &&
		payload.pull_request.merged_at &&
		config.merged
	) {
		return handleMerge(payload, config)
	}

	return 'Pull Request -- No action taken'
}

export default PullRequest
