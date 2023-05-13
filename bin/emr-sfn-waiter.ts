import * as cdk from 'aws-cdk-lib';
import { EmrSfnExampleStack } from './emr-sfn-example-stack';

const app = new cdk.App();
new EmrSfnExampleStack(app, "EmrSfnExampleStack", {})

app.synth();