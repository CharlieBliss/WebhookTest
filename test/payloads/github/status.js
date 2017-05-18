export const failure = JSON.stringify(
	{
		"repository": {
			"html_url": "https://github.com/Kyle-Mendes/public-repo",
			"full_name": "Kyle-Mendes/public-repo",
		},
	  "name": "Kyle-Mendes/public-repo",
	  "context": "ci/circleci",
	  "state": "failure",
		"commit":
		{
			"author": { "id": '6400039' },
			"html_url": "https://github.com/Kyle-Mendes/public-repo/commit/9049f1265b7d61be4a8904a9a27120d2064dab3b",
		},
	})

export const success = JSON.stringify(
	{
	  "name": "Kyle-Mendes/public-repo",
		"repository": {
			"html_url": "https://github.com/Kyle-Mendes/public-repo",
			"full_name": "Kyle-Mendes/public-repo",
		},
	  "context": "ci/circleci",
	  "state": "success",
		"commit":
		{
			"author": { "id": '6400039' },
			"html_url": "https://github.com/Kyle-Mendes/public-repo/commit/9049f1265b7d61be4a8904a9a27120d2064dab3b",
		},
	})

export const qaCircleSuccess = JSON.stringify(
	{
		state: 'success',
		description: 'All tickets marked as complete.',
		context: 'ci/qa-team',
	}
)

export const qaWaitingOn2 = JSON.stringify(
	{
		state: 'failure',
		description: 'Waiting on two tickets to be marked as "done".',
		context: 'ci/qa-team',
	}
)

export const qaWaitingOn1 = JSON.stringify(
	{
		state: 'success',
		description: 'Waiting on 1 ticket to be marked as "done".',
		context: 'ci/qa-team',
	}
)