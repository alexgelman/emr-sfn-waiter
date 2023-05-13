import { CfnApplication } from 'aws-cdk-lib/aws-emrserverless';
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Choice, Condition, IChainable, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

export function chainEmrJobWaitPattern(scope: Construct, emrApplication:CfnApplication, jobRunState:CallAwsService, onSuccessState:IChainable, onFailState:IChainable) : IChainable {
  const getJobState = new CallAwsService(scope, "GetJobInfo", {
    service: "emrserverless",
    action: "getJobRun",
    resultPath: "$.JobStatus",
    iamResources: [emrApplication.attrApplicationId],
    parameters: {
      "ApplicationId.$": "$.JobInfo.ApplicationId",
      "JobRunId.$": "$.JobInfo.JobRunId"
    }
  });

  const statusRetryWait = new Wait(scope, "JobStatusRetryWait", {
    time: WaitTime.duration(Duration.seconds(60))
  });

  const retryChain = statusRetryWait.next(getJobState);

  const jobStatusChoice = new Choice(scope, "JobStatusChoice")
    .when(Condition.stringEquals("$.JobStatus.JobRun.State", "SUCCESS"), onSuccessState)
    .when(Condition.or(
      Condition.stringEquals("$.JobStatus.JobRun.State", "FAILED"),
      Condition.stringEquals("$.JobStatus.JobRun.State", "CANCELLED")
    ), onFailState)
    .otherwise(retryChain);

  const jobWaitChain = jobRunState.next(getJobState).next(jobStatusChoice);
  return jobWaitChain;
}
