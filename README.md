# AWS Lambda EC2 Scheduled Start/Stop

While experimenting with AWS EC2 instances, there is the possibility that you might leave one or more instances running overnight or over the weekend accidentally,
resulting in higher bills!  This Lambda function utilizes CloudWatch's scheduled events capability (similar to `cron`) to trigger the start and/or stop functions.

This code traverses all available AWS Regions.

## Installation

1. Configure the `serverless.yml` configuration to represent your serverless IAM role
1. Simply execute `serverless deploy -v`

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

This project is licensed under the MIT License.