export const schemaToInProgress = {
	"timestamp": 1503952699937,
	"webhookEvent": "jira:issue_updated",
	"issue_event_type_name": "issue_generic",
	"user": {
		"self": "https://reelio.atlassian.net/rest/api/2/user?username=kyle",
		"name": "kyle",
		"key": "kyle",
		"accountId": "557058:4e53caf8-0e84-4bce-b731-df5c88c32b41",
		"emailAddress": "kyle@reeliolabs.com",
		"displayName": "Kyle Mendes",
		"active": true,
		"timeZone": "America/New_York"
	},

	"issue": {
		"id": "27609",
		"self": "https://reelio.atlassian.net/rest/api/2/issue/27609",
		"key": "test-123",
		"fields": {
			"assignee": {
				"key": "kyle",
			},
			"project": {
				"self": "https://reelio.atlassian.net/rest/api/2/project/11400",
				"id": "11400",
				"key": "test",
				"name": "test",
			},
		},
	},
	"changelog": {
		"id": "89708",
		"items": [
			{
				"field": "status",
				"fieldtype": "jira",
				"fieldId": "status",
				"from": "10003",
				"fromString": "Backlog",
				"to": "3",
				"toString": "In Progress"
			}
		]
	}
}
