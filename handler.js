'use strict';

// require libraries
let request = require('request');
let AWS = require('aws-sdk');
let https = require('https');

// declare aws objects
let cloudwatch = new AWS.CloudWatch();
let docClient = new AWS.DynamoDB.DocumentClient();

// declare variables
const ENDPOINT_TIMEOUT = 5000; // milliseconds
const SLACK_WEBHOOK_URL = process.env.slackWebhookUrl;
const DYNAMO_TABLE = process.env.dynamoTable;
const ENABLE_METRICS = process.env.enableMetrics || true;
const SNS_TOPIC_ARN = process.env.snsTopicArn;
let cloudWatchOutput = {};

// main function
module.exports.http = (event, context, callback) => {
    // get all the endpoints
    let endpoints = event;
    console.log('endpoints:', endpoints);

    // iterate over all endpoints
    endpoints.forEach(function(endpoint) {
        console.log("Requesting " + endpoint);

        // get record from dynamo DB
        getDynamoDbRecord(endpoint).then(function (dynamoTableReadRecord) {
            // get the old status code
            let oldStatusCode = null;
            let newStatusCode = null;
            if (dynamoTableReadRecord.Item) {
                oldStatusCode = dynamoTableReadRecord.Item.statusCode;
            }

            // check the request
            let requestObj = {
                "uri": endpoint,
                "time": true,
                "timeout": ENDPOINT_TIMEOUT,
            };
            request(requestObj, function (error, response, body) {
                // create the stats for this request.
                if (error) {
                    cloudWatchOutput[ endpoint ] = {
                        "HTTPError": error.code,
                        "statusCode": 0,
                        "durationMS": 0,
                    };
                    newStatusCode = 0;
                } else {
                    cloudWatchOutput[ endpoint ] = {
                        "statusCode": response.statusCode,
                        "durationMS": response.timingPhases.total
                    };
                    newStatusCode = response.statusCode;
                }

                // new and old status code different send slack alert
                if (newStatusCode !== oldStatusCode) {
                    sendSlackAlert(endpoint, newStatusCode);
                    updateDynamo(endpoint, cloudWatchOutput[ endpoint ]);
                    publishMessageSns(endpoint, newStatusCode);
                }

                // update cloud watch
                if (ENABLE_METRICS === true) {
                    updateCloudWatch(endpoint, cloudWatchOutput)
                }
            });
        });
    });

    waitForCompletion();

    // get record from dynamodb
    async function getDynamoDbRecord(endpoint) {
        let params = {
            TableName: DYNAMO_TABLE,
            Key: {
                "endpoint": endpoint
            }
        };
        return await docClient.get(params).promise();
    }

    // update the item, unconditionally, inside dynamodb
    function updateDynamo(endpoint, values) {
        let params = {
            TableName: DYNAMO_TABLE,
            Key:{
                "endpoint": endpoint
            },
            UpdateExpression: "set statusCode = :statusCode",
            ExpressionAttributeValues:{
                ":statusCode": values.statusCode
            },
            ReturnValues:"UPDATED_NEW"
        };
        // save to Dynamo DB
        docClient.update(params, function(err, data) {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    }

    // send slack alert
    function sendSlackAlert(endpoint, statusCode) {
        let messageBody = {
            "text": ":tada: " + endpoint + " *is up*",
        };

        // if service is down
        if (statusCode !== 200) {
            messageBody = {
                "text": ":thumbsdown: " + endpoint + " *is down*",
            };
        }

        // stringify our message body
        messageBody = JSON.stringify(messageBody);
        // promisify the https.request
        return new Promise((resolve, reject) => {
            // general request options, we defined that it's a POST request and content is JSON
            const requestOptions = {
                method: 'POST',
                header: {
                    'Content-Type': 'application/json'
                }
            };
            // actual request
            const req = https.request(SLACK_WEBHOOK_URL, requestOptions, (res) => {
                let response = '';
                res.on('data', (d) => {
                    response += d;
                });
                // response finished, resolve the promise with data
                res.on('end', () => {
                    resolve(response);
                })
            });

            // there was an error, reject the promise
            req.on('error', (e) => {
                reject(e);
            });
            // send our message body (was parsed to JSON beforehand)
            req.write(messageBody);
            req.end();
        });
    }

    // publish message to sns
    function publishMessageSns(endpoint, statusCode)
    {
        let message = endpoint + " is up";

        // if service is down
        if (statusCode !== 200) {
            message = endpoint + " is down";
        }

        let params = {
            Message: message,
            Subject: message,
            TopicArn: SNS_TOPIC_ARN
        };

        // publish message
        let publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();

        // handle promise's fulfilled/rejected states
        publishTextPromise.then(
            function(data) {
                console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
            }).catch(
            function(err) {
                console.error(err, err.stack);
            });
    }

    // push metrics to cloudWatch.
    function updateCloudWatch(endpoint, output) {
        console.log(endpoint +" : "+ JSON.stringify(output [ endpoint ]));
        let params = {
            Namespace: 'serverless-monitor',
            MetricData: [
                {
                    MetricName: 'StatusCode',
                    Dimensions: [
                        {
                            Name: 'Endpoint',
                            Value: endpoint
                        }
                    ],
                    StatisticValues: {
                        SampleCount: 1,
                        Sum: output[endpoint]["statusCode"],
                        Minimum: 0,
                        Maximum: 1000,
                    },
                    Unit: 'None'
                },
                {
                    MetricName: 'Latency',
                    Dimensions: [
                        {
                            Name: 'Endpoint',
                            Value: endpoint
                        }
                    ],
                    StatisticValues: {
                        SampleCount: 1,
                        Sum: output[endpoint]["durationMS"],
                        Minimum: 0,
                        Maximum: 30000,
                    },
                    Unit: 'Milliseconds'
                }
            ]
        };
        cloudwatch.putMetricData(params, function(error, data) {
            if (error) {
                console.log("Unexpected issue posting metrics to CloudWatch");
                console.log(error, error.stack);
            } else {
                console.log("Logged metrics in Cloudwatch at: "+ params['Namespace']);
            }
        });
    }

    // we need to wait for all the callbacks to complete, otherwise we'll end up
    // not returning any, or only a subset, of the results.
    function waitForCompletion() {
        // count of output objects should match count of endpoints
        if (Object.keys(cloudWatchOutput).length < endpoints.length) {
            setTimeout(waitForCompletion, 100);
            return;
        }

        // log the finalised output object, as well as returning it to the requester.
        console.log("Final results:");
        console.log(JSON.stringify(cloudWatchOutput));
        callback(null, cloudWatchOutput);
    }
};
