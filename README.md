<h1 align="center">
    <img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/logo.png" alt="serverless-monitor" width="100"> <br>
    Serverless Monitor <br>
</h1>

<h3 align="center">
    A serverless website monitoring tool built on AWS Infrastructure.
</h3>

<img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/architecture.png" alt="serverless-monitor">

## Key Features

- 100% Serverless
- Unlimited website monitoring
- Slack alerts only when status is changed
- SNS Topic Publish only on status change. SNS can send alerts via
    - SMS/Text Message
    - Email
    - Push    
    - etc.
- Basic Cloudwatch Graphs and Metrics
- Docker support For development environment
- *Low cost monitoring

## Cost Estimation

Below is quick cost estimation of using this tool. These are just sample cost estimation. Please note these prices cannot be used as a final or real  price for using this tool and can vary depending on the configuration.

**Please do your own research and check AWS pricing before using the tool.**   

### Assumptions

- Paid tier
- Scheduler runs every 5 minutes
- Lambda function timeout set to 30 seconds
- Lambda function uses max 128 MB Memory
- Lambda number of request is 8640
- Lambda request duration is 30000 ms
- 500 Text Message (United States) per month
- 500 Email per month
- Cost is per month

### With CloudWatch Metrics 

| #| Endpoints | Lambda Cost | Metrics | DynamoDB | SNS  | Total  |
|------|------|------|------|------|------|------|
| 1 | 10   | $0.54  | $6   | $0 | $3.235 | $9.775   |
| 2 | 50   | $0.54  | $30  | $0 | $3.235 | $33.775  |
| 3 | 100  | $0.54  | $60  | $0 | $3.235 | $63.775  |
| 4 | 500  | $0.54  | $300 | $0 | $3.235 | $303.775 |


### Without CloudWatch Metrics

| #| Endpoints | Lambda Cost | Metrics | DynamoDB | SNS  | Total  |
|------|------|------|------|------|------|------|
| 1 | 10   | $0.54  | $0  | $0 | $3.235 | $3.775 |
| 2 | 50   | $0.54  | $0  | $0 | $3.235 | $3.775 |
| 3 | 100  | $0.54  | $0  | $0 | $3.235 | $3.775 |
| 4 | 500  | $0.54  | $0  | $0 | $3.235 | $3.775 |


## Prerequisite

- [AWS Account](https://aws.amazon.com/)
- [nodeJs](https://nodejs.org/en/) OR docker with docker-compose 
- [AWS CLI](https://aws.amazon.com/cli/) OR docker with docker-compose 
- [Serverless Framework]() OR docker with docker-compose 

## Getting Started

1. Clone the repo locally
```shell script
git clone git@github.com:akki-io/serverless-monitor.git
```

### With Docker

1. Start the docker container
```shell script
docker-compose up -d
```
2. Install Dependencies
```shell script
docker-compose exec node npm install
```
3. Configure AWS CLI
```shell script
docker-compose exec node aws configure
```

### Without Docker

1. Install Dependencies
```shell script
npm install
```
2. Configure AWS CLI
```shell script
aws configure
```

### Update `serverless.yml`

Copy `serverless-example.yml` to `serverless.yml`

```shell script
cp serverless-example.yml serverless.yml
```

Configure a slack incoming webhook and update `slackWebhookUrl`

```yaml
environment:    
    slackWebhookUrl: UPDATE_YOUR_SLACK_WEBHOOK HERE # https://slack.com/intl/en-ca/help/articles/115005265063-Incoming-Webhooks-for-Slack
```

If you want to disable cloud metrics set `enableMetrics` to `false` in `serverless.yml`

```yaml
environment:    
    enableMetrics: false
```

Update your website/api urls under `input`

```yaml
input:
    - 'https://www.google.com'
    - 'https://www.tekz.io'
    - 'https://www.akki.io'
```

## Deployment

Once you have modified your `serverless.yml` it is time to deploy the project to AWS.

### With Docker

```shell script
docker-compose exec node serverless deploy --stage prod --region us-east-1
```

### Without Docker

```shell script
serverless deploy --stage prod --region us-east-1
```

This will deploy the project to `us-east-1`

**Deployment Output**

```shell script
Serverless: Packaging service...
Serverless: Excluding development dependencies...
Serverless: Uploading CloudFormation file to S3...
Serverless: Uploading artifacts...
Serverless: Uploading service monitor.zip file to S3 (1.37 MB)...
Serverless: Validating template...
Serverless: Updating Stack...
Serverless: Checking Stack update progress...
...........
Serverless: Stack update finished...
Service Information
service: monitor
stage: prod
region: us-east-1
stack: monitor-prod
resources: 9
api keys:
  None
endpoints:
  None
functions:
  http: monitor-prod-http
layers:
  None
Serverless: Run the "serverless" command to setup monitoring, troubleshooting and testing.
```

A quick look at the Resources created by AWS using CloudFormation

<img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/resources.jpg" alt="serverless-monitor-resources">

## Add new website/api or deploying changes 

If you made changes to the `serverless.yml` or added new inputs for website/API. 

You can simply call this command to update the existing stack.

### With Docker

```shell script
docker-compose exec node serverless deploy --stage prod --region us-east-1
```

### Without Docker

```shell script
serverless deploy --stage prod --region us-east-1
```

## Adding Subscriptions to the SNS Topic

This tool creates a empty topic without any subscriptions attached. You can add your own subscriptions like email, SMS etc.

<img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/sns-subscription.jpg" alt="serverless-monitor-sns-subscription">

## Local Tinkering

### With Docker

**Invoke the cloud function**
 
```shell script
docker-compose exec node \
	serverless invoke \
	--stage prod --region us-east-1 --function http \
	--data '["https://www.google.com"]'
```

**Invoke the local copy of the function**

```shell script
docker-compose exec node \
	serverless invoke local \
	--stage prod --function http \
	--data '["https://www.google.com"]'
```

### Without Docker

**Invoke the cloud function**
 
```shell script
serverless invoke \
    --stage prod --region us-east-1 --function http \
	--data '["https://www.google.com"]'
```

**Invoke the local copy of the function**

```shell script
serverless invoke local \
	--stage prod --function http \
	--data '["https://www.google.com"]'
```

You will then see an output similar to below.

```shell script
endpoints: [ 'https://www.google.com' ]
Requesting https://www.google.com
https://www.google.com : {"statusCode":200,"durationMS":229.07045600000015}
Final results:
{"https://www.google.com":{"statusCode":200,"durationMS":229.07045600000015}}
{
    "https://www.google.com": {
        "statusCode": 200,
        "durationMS": 229.07045600000015
    }
}
Logged metrics in Cloudwatch at: serverless-monitor
```

## Screenshots

**Slack Alerts**

<img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/slack-alert.jpg" alt="serverless-monitor-resources">

**CloudWatch Graph**

<img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/chart.jpg" alt="serverless-monitor-resources">

**Text Alerts**

<img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/sms.png" alt="serverless-monitor-text">

**Email Alerts**

<img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/email.jpg" alt="serverless-monitor-email">

## Contributions
All contributions are welcomed, please create a Pull Request.

## Credits
- [lambda-ping](https://github.com/jethrocarr/lambda-ping) - Inspiration

## Todo

- ~~AWS SNS Topic~~
- ~~Enable/Disable Metrics~~
- Enable/Disable Slack
- Custom Success Status Code
- ~~Cost Estimation~~
- ... suggestions?

## Donations
- [Plant a tree](https://offset.earth/) 

## License
Licensed under the MIT license.

Built with <span style="color: #e25555;padding: 0px 3px;">♥</span> in <img src="https://raw.githubusercontent.com/akki-io/serverless-monitor/master/images/ca.png" alt="Canada" width="20"> </div>
