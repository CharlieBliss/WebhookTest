import { get } from 'lodash'

import CheckReviews from './CheckReviews'
import CheckTickets from './CheckTickets'
import Labels from './Labels'
import PullRequest from './PullRequest'
import Push from './Push'
import Review from './Review'
import Status from './Status'

import helper from '../../helpers/github'
import firebase from '../../helpers/firebase'

import config from '../../../config.json'

const handler = 'github'

export function handle(event, context, callback) {
	const headers = event.headers,
		githubEvent = headers['X-GitHub-Event'] || headers['X-Github-Event'],
		payload = JSON.parse(event.body),
		action = payload.action

	const fullRepo = payload.repository.full_name,
		org = fullRepo.split('/')[0],
		repo = fullRepo.split('/')[1]

	/* eslint-disable */
	console.log('---------------------------------');
	console.log(`Github-Event: "${githubEvent}" with action: "${action}"`);
	console.log('---------------------------------');
	console.log(payload, headers)
	/* eslint-enable */

	firebase.log('github', fullRepo, githubEvent, action, payload)

	if (!githubEvent) {
		return callback(null, helper.respond('No event provided.', 400))
	}


	if (
		!action &&
		githubEvent !== 'status' &&
		githubEvent !== 'push'
	) {
		return callback(null, helper.respond('No action given.', 200))
	}

	if (
		githubEvent === 'pull_request' ||
		githubEvent === 'pull_request_review'
	) {
		if (get(config, [org, repo, handler, 'require_reviews', 'enabled'])) {
			CheckReviews(payload, githubEvent, get(config, [org, repo, handler, 'require_reviews', 'count']))
		}
	}

	if (githubEvent === 'pull_request') {
		if (action === 'labeled' || action === 'unlabeled') {
			if (get(config, [org, repo, handler, 'labels', 'enabled'])) {
				Labels(payload, get(config, [org, repo, handler, 'require_reviews', 'count']))
			}
		}
		if (get(config, [org, repo, handler, 'pull_request', 'enabled'])) {
			if (get(config, [org, repo, handler, 'pull_request', 'check_tickets'])) {
				CheckTickets(payload, githubEvent, get(config, [org, repo, handler, 'pull_request', 'done_status']))
			}
			return callback(null, helper.respond(PullRequest(payload, get(config, [org, repo, handler, 'pull_request']))))
		}
	}

	if (githubEvent === 'push') {
		if (get(config, [org, repo, handler, 'push', 'enabled'])) {
			return callback(null, helper.respond(Push(payload)))
		}
	}

	if (githubEvent === 'pull_request_review') {
		if (get(config, [org, repo, handler, 'pull_request_review', 'enabled'])) {
			return callback(null, helper.respond(Review(payload)))
		}
	}

	if (githubEvent === 'status') {
		if (get(config, [org, repo, handler, 'status', 'enabled'])) {
			return callback(null, helper.respond(Status(payload)))
		}
	}

	return callback(null, helper.respond('No actions taken.'))
}
