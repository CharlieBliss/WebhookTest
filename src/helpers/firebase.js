import * as admin from 'firebase-admin'
import request from 'request'
import { cloneDeep, get } from 'lodash'

import Slack from './slack'

const serviceAccount = require('../consts/firebase-auth.json')

class Firebase {
	constructor() {
		this.serviceAccount = serviceAccount

		admin.credential.cert(this.serviceAccount).getAccessToken().then((res) => {
			this.token = res.access_token
		}).catch((e) => {
			console.warn(`\nFirebase authentication failed. ${e}\n`)
		})
	}

	// Logs an action into the right event, project and service
	// For example: Github -> reelio-front -> pull_request -> opened

	log(service, project, event, action, originalPayload) {
		const payload = cloneDeep(originalPayload)

		if (
			event === 'create' ||
			event === 'delete'
		) {
			action = payload.ref_type
		}

		if (event === 'pull_request_review') {
			action = `${action} - ${payload.review.state}`
		}


		// Only log circle failures
		if (event === 'status' && payload.state !== 'failure') {
			return 'Firebase Not Logging'
		}

		// global
		delete payload.repository
		delete payload.master_branch
		delete payload.organization
		delete payload.pusher_type
		delete payload.ref_type
		delete payload.branches
		delete payload.head_commit

		try {
			// comments
			if (payload.comment) {
				payload.comment_info = {
					author: get(payload, 'comment.user.login'),
					issue: {
						url: payload.issue ? payload.issue.url : '',
						title: payload.issue ? payload.issue.title : '',
					},
				}

				delete payload.comment
			}

			if (payload.pull_request) {
				if (payload.pull_request.head) {
					payload.pull_request.head_info = payload.pull_request.head.ref
					delete payload.pull_request.head
				}

				if (payload.pull_request.base) {
					payload.pull_request.base_info = payload.pull_request.base.ref
					delete payload.pull_request.base
				}

				delete payload.pull_request._links // eslint-disable-line
			}

			// pr review
			if (payload.review) {
				payload.reviewer = {
					name: get(payload, 'review.user.login'),
					id: get(payload, ['review', 'user', 'id']),
					status: get(payload, 'review.state'),
					body: get(payload, 'review.body'),
				}

				delete payload.review
			}

			// push
			if (payload.commits) {
				payload.commit_count = payload.commits.length || 0
				delete payload.commits
			}

			if (payload.sender) {
				payload.sender_info = {
					id: get(payload, ['sender', 'id']),
					author: get(payload, 'sender.login'),
				}

				delete payload.sender
			}

			// status (CI)
			if (payload.commit) {
				payload.commit_info = {
					url: payload.commit.url,
					author: {
						id: get(payload, ['commit', 'author', 'id']),
						login: get(payload, 'commit.author.login'),
					},
				}
				delete payload.commit
			}
		} catch (err) {
			console.error(err)
			Slack.firebaseFailed(err)
		}
		if (action) {
			request.put(`https://webhooks-front.firebaseio.com/${service}/${project}/${event}/${action}/${Date.now()}.json?access_token=${this.token}`, { body: JSON.stringify(payload) })
		} else {
			request.put(`https://webhooks-front.firebaseio.com/${service}/${project}/${event}/${Date.now()}.json?access_token=${this.token}`, { body: JSON.stringify(payload) })
		}
		return `Logged ${event}`
	}
}

export default new Firebase()
