# AWS EMR Serverless SFN Waiter Workflow

This CDK library demonstrates how to implement a Step Function workflow that starts an EMR Serverless job and waits until the job completes before continuing the workflow execution.

## Workflow

![](https://github.com/alexgelman/emr-sfn-waiter/blob/main/resources/stepfunctions_graph.png)

The workflow steps are as flows:
1. Call the StartJobRun EMR Serverless API.
1. Call GetJobRun EMR Serverless API to get the job run status.
1. Depending on the job run status do the following:
    1. If the status is `SUCCESS`, proceed to the success state chain.
    1. IF the status is either `FAILED` or `CANCELLED`, proceed to the fail state chain.
    1. Otherwise, wait for 60 seconds and retry the status check.

## Usage:

The library contains a helper function `chainEmrJobWaitPattern` that can be used from any CDK construct.<br>
Given an `emrServerlessApp` of type `CfnApplication` the helper function can be used in the following manner:

```typescript
const runJobState = new CallAwsService(this, "RunSparkJob", {
    service: "emrserverless",
    action: "startJobRun",
    resultPath: "$.JobInfo",
    iamResources: [emrServerlessApp.attrArn],
    parameters: {
        ApplicationId: emrServerlessApp.attrApplicationId,
        "ClientToken.$": "States.UUID()",
        JobDriver: {
            SparkSubmit: {
                EntryPoint: "s3://example-jar/job.jar",
                SparkSubmitParameters: "MainClass",
            },
        },
        ExecutionRoleArn: jobRole.roleArn,
    },
});

const successState = new Succeed(this, "SuccessState");
const failState = new Fail(this, "FailState");

// Create a workflow that polls for job completion before continuing to either success or fail chains.
const definition = chainEmrJobWaitPattern(this, emrServerlessApp, runJobState, successState, failState);
```

# API Reference <a name="API Reference" id="api-reference"></a>





