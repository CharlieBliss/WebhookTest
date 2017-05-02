const expect = require('chai').expect
const nock = require('nock')

const Tickets = require('../../src/helpers/tickets').default
const Slack = require('../../src/helpers/slack').default
const consts = require('../../src/consts/slack')



describe('helpers -- tickets', () => {
	beforeEach(() => {
		nock.cleanAll()
	})
	it('Should be able to alert when changes are requested', (done) => {
		const payload = {
			review: {
				html_url: 'http://reelio.com',
			},
		}

		const user = consts.FRONTEND_MEMBERS[6400039]
		const textRegexp = new RegExp(`^(?=.*\\b${user.name}\\b)(?=.*\\bhttp:\\/\\/reelio\\.com\\b).*$`)
		const slack = nock(consts.SLACK_URL)
			.post('', { channel: user.slack_id, text: textRegexp })
			.reply(200)

		Slack.changesRequested(payload, user)

		setTimeout(() => {
			expect(slack.isDone()).to.be.true
			expect(nock.pendingMocks()).to.be.empty
			done()
		}, 10)
	})

})
