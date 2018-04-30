const mochaPlugin = require('serverless-mocha-plugin')
const nock = require('nock')
const expect = mochaPlugin.chai.expect

const headers = require('../payloads/headers')
const payloads = require('../payloads/github')
const nocks = require('../nocks')
const Labels = require('../../src/handlers/github/Labels').default

describe('Properly handles Adding Label', () => {
	beforeEach(() => {
		nock.cleanAll()
		nock.disableNetConnect()
	})


	it('Handles "WIP Added" event', (done) => {
		const removeReview = nocks.labels.removeReview()


		let payload = payloads.label.addWIP
		Labels(payload)
		setTimeout(() => {
			expect(removeReview.isDone()).to.be.true
			expect(nock.pendingMocks()).to.be.empty
			done()
		}, 50)
	})
})

describe('Properly handles Removing Labels', () => {
	beforeEach(() => {
		nock.cleanAll()
		nock.disableNetConnect()
	})

	it('Handles "WIP removed" label removed', (done) => {
		let payload = payloads.label.removeWIP
		let sha = payload.pull_request.head.sha

		const addReview = nocks.labels.addReview()
		const addQAandApproved = nocks.labels.addQAandApproved()
		const removeChangesRequested = nocks.labels.removeChangesRequested()
		const removeReview = nocks.labels.removeReview()
		const doubleApproved = nocks.reviews.doubleApproved()
		const status = nocks.status.genericStatus(sha)
		const labels = nocks.labels.genericLabelsGet()
		const getJiraStatus = nocks.jira.genericTicketData(3)
		const createTable = nocks.jira.createTable()

		Labels(payload)
		setTimeout(() => {
			expect(addReview.isDone()).to.be.true
			expect(addQAandApproved.isDone()).to.be.true
			expect(removeReview.isDone()).to.be.true
			expect(removeChangesRequested.isDone()).to.be.true
			expect(doubleApproved.isDone()).to.be.true
			expect(status.isDone()).to.be.true
			expect(labels.isDone()).to.be.true
			expect(getJiraStatus.isDone()).to.be.true
			expect(createTable.isDone()).to.be.true
			expect(nock.pendingMocks()).to.be.empty
			done()
		}, 100)
	})

	it('Handles "Changes Requested" label removed', (done) => {
		const reviews = nocks.reviews.singleChangesRequested()
		const slack = nocks.slack.genericSlack()
		const addReview = nocks.labels.addReview()

		let payload = payloads.label.removeChanges
		Labels(payload)
		setTimeout(() => {
			expect(addReview.isDone()).to.be.true
			expect(slack.isDone()).to.be.true
			expect(reviews.isDone()).to.be.true
			expect(nock.pendingMocks()).to.be.empty
			done()
		}, 100)
	})

})
