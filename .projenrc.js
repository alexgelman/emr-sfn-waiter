const { cdk } = require('projen');

const project = new cdk.JsiiProject({
  name: 'emr-sfn-waiter',
  description: 'CDK library for an SFN workflow that polls for EMR Serverless job completion',
  authorName: 'Alex Gelman',
  authorEmail: '6887237+alexgelman@users.noreply.github.com',
  repository: 'https://github.com/alexgelman/emr-sfn-waiter',
  license: 'MIT',
  vscode: true,
  gitignore: [
    '.DS_Store',
    '.mypy_cache/',
  ],
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
  releaseToNpm: true,
  publishToNuget: {
    dotNetNamespace: 'Alexg.Cdk.EmrSfnWaiter',
    packageId: 'Alexg.Cdk.EmrSfnWaiter',
  },
  publishToPypi: {
    distName: 'emr-sfn-waiter',
    module: 'emr_sfn_waiter',
  },
  defaultReleaseBranch: 'main',
  deps: [
    'aws-cdk-lib',
    'constructs',
  ],
  peerDeps: [
    'aws-cdk-lib',
    'constructs',
  ],
  devDeps: [
    'aws-cdk-lib',
    'aws-cdk@^2.79.1',
    'aws-sdk',
    'esbuild',
    'constructs',
  ],
  keywords: [
    'cdk',
    'aws-cdk@^2.79.1',
    'constructs',
  ],
  srcdir: 'lib',
  testdir: 'test',
  autoApproveOptions: {
    allowedUsernames: ['alexgelman'],
    secret: 'GITHUB_TOKEN',
  },
  autoApproveUpgrades: true,
});

project.gitignore.exclude('cdk.out');

project.setScript('integ', "npx cdk -a 'node bin/emr-sfn-waiter.js'");
const deploy = project.addTask('integ:deploy');
deploy.spawn(project.compileTask);
deploy.exec('yarn integ deploy');

const destroy = project.addTask('integ:destroy');
destroy.spawn(project.compileTask);
destroy.exec('yarn integ destroy');

project.synth();
