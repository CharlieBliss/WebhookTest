import * as admin from 'firebase-admin'

import Slack from './slack'

const serviceAccount = require('../consts/firebase-auth.json')

class Firebase {
	constructor() {
		this.serviceAccount = serviceAccount

		// Initialize the firebase app
		admin.initializeApp({
			credential: admin.credential.cert(this.serviceAccount),
			databaseURL: 'https://webhooks-front.firebaseio.com',
		})

		this.db = admin.database()
	}

	// Logs an action into the right event, project and service
	// For example: Github -> reelio-front -> pull_request -> opened
	log(service, project, event, action, payload) {
		setTimeout(() => {
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
				return
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
						author: payload.comment.user.login,
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
						name: payload.review.user.login,
						id: payload.review.user.id,
						status: payload.review.state,
						body: payload.review.body,
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
						id: payload.sender.id,
						author: payload.sender.login,
					}

					delete payload.sender
				}

				// status (CI)
				if (payload.commit) {
					payload.commit_info = {
						url: payload.commit.url,
						author: {
							id: payload.commit.author.id,
							login: payload.commit.author.login,
						},
					}
					delete payload.commit
				}
			} catch (err) {
				Slack.firebaseFailed(err)
			}

			if (action) {
				this.db.ref(`${service}/${project}/${event}/${action}/${Date.now()}`).set(payload)
			} else {
				this.db.ref(`${service}/${project}/${event}/${Date.now()}`).set(payload)
			}
		}, 5000)
	}
}

export default Firebase
