// import * as cdk from 'aws-cdk-lib';
import { CfnApplication } from 'aws-cdk-lib/aws-emrserverless';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Choice, Condition, Fail, IChainable, StateMachine, Succeed, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface SparkRetryProps {
  // Define construct properties here
}

export class SparkRetry extends Construct {

  constructor(scope: Construct, id: string, props: SparkRetryProps = {}) {
    super(scope, id);

    const emrServerlessApp = new CfnApplication(this, "EmrServerlessApp", {
      releaseLabel: "emr-6.9.0",
      type: "Spark",
      architecture: "ARM64",
      name: "ExampleEmr"
    });

    const jobRole = new Role(this, "JobRole", {
      roleName: "SparkJobRole",
      assumedBy: new ServicePrincipal("emr-serverless.amazonaws.com")
    });

    const runJobState = new CallAwsService(this, "RunSparkJob", {
      service: "emrserverless",
      action: "startJobRun",
      resultPath: "$.JobInfo",
      iamResources: [emrServerlessApp.attrArn],
      parameters: {
        "ApplicationId" : emrServerlessApp.attrApplicationId,
        "ClientToken.$": "States.UUID()",
        "JobDriver": {
          "SparkSubmit": {
            "EntryPoint": "s3://example-jar/job.jar",
            "SparkSubmitParameters": "MainClass"
          }
        },
        "ExecutionRoleArn": jobRole.roleArn
      }
    });

    const successState = new Succeed(this, "SuccessState");
    const failState = new Fail(this, "FailState");
    const definition = this.chainEmrJobWaitPattern(emrServerlessApp, runJobState, successState, failState);

    const stepFunction =  new StateMachine(this, "ExampleStepFunction", {
      definition: definition
    })
    stepFunction.addToRolePolicy(new PolicyStatement({
      actions: ["emr-serverless:StartJobRun", "emr-serverless:GetJobRun"],
      resources: [emrServerlessApp.attrArn, emrServerlessApp.attrArn + "/jobruns/*"],
      effect: Effect.ALLOW
    }))
    jobRole.grantPassRole(stepFunction.role);
  }

  chainEmrJobWaitPattern(emrApplication:CfnApplication, jobRunState:CallAwsService, onSuccessState:IChainable, onFailState:IChainable) : IChainable {
    const getJobState = new CallAwsService(this, "GetJobInfo", {
      service: "emrserverless",
      action: "getJobRun",
      resultPath: "$.JobStatus",
      iamResources: [emrApplication.attrApplicationId],
      parameters: {
        "ApplicationId.$": "$.JobInfo.ApplicationId",
        "JobRunId.$": "$.JobInfo.JobRunId"
      }
    });

    const statusRetryWait = new Wait(this, "JobStatusRetryWait", {
      time: WaitTime.duration(Duration.seconds(60))
    });

    const retryChain = statusRetryWait.next(getJobState);

    const jobStatusChoice = new Choice(this, "JobStatusChoice")
      .when(Condition.stringEquals("$.JobStatus.JobRun.State", "SUCCESS"), onSuccessState)
      .when(Condition.or(
        Condition.stringEquals("$.JobStatus.JobRun.State", "FAILED"),
        Condition.stringEquals("$.JobStatus.JobRun.State", "CANCELLED")
      ), onFailState)
      .otherwise(retryChain);

    const jobWaitChain = jobRunState.next(getJobState).next(jobStatusChoice);
    return jobWaitChain;
  }
}
