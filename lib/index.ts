// import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface SparkRetryProps {
  // Define construct properties here
}

export class SparkRetry extends Construct {

  constructor(scope: Construct, id: string, props: SparkRetryProps = {}) {
    super(scope, id);

    // Define construct contents here

    // example resource
    // const queue = new sqs.Queue(this, 'SparkRetryQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
