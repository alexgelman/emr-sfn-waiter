import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as cdk from "aws-cdk-lib";
import { CfnApplication } from "aws-cdk-lib/aws-emrserverless";
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Fail, StateMachine, Succeed } from 'aws-cdk-lib/aws-stepfunctions';
import { chainEmrJobWaitPattern } from '../lib';

export class EmrSfnExampleStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

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
        const definition = chainEmrJobWaitPattern(this, emrServerlessApp, runJobState, successState, failState);
    
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
}