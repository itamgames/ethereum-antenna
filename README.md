# Ethereum Event Listener

## Motivation
ITAM team currently uses BSC event listener internally.
But, our listener faced performance issue when updating massive transaction on same blocknumber.
We have been tried to find other solution for blockchain event listener solutions.

Most popular ethereum event listener solution is Eventeum.
But we have faced missing event especially on bsc and Eventeum is not ideal solution.
We need to update Eventeum internally to solve missing event case but it is written in Java.
Our team has confidence to javascript so there is a learning curve to update Eventeum.

So we have planed to update our bsc event listener written in javascript.
And also we will open our event listener to public to listen user's feedback and improve it.

## Getting Started
1. install dependencies
Ethereum Event listener use yarn as package manager
```javascript
$ yarn install ethereum-antenna
```
you can use npm alternatively
```javascript
$ npm install ethereum-antenna
```
2. initialize
Some environment variables used in code are not opened to repository.
```ts
import EthereumAntenna from 'ethereum-antenna';

import 'dotenv/config'; // In case of using environment variables such as `AWS_ACCESS_KEY_ID`;

const antenna = new EthereumAntenna({
  eventStore: {
    type: 'mongodb',
    uri: <MONGO_URI>,
  },
  producer: {
    type: 'sqs',
    region: <AWS_REGION>,
    queueUrl: <BLOCKCHAIN_QUEUE_URL>,
  },
  http: {
    type: 'koa',
  },
  rpc: <BLOCKCHAIN_RPC_URL>,
});

await antenna.run();
```
You should add some parameters to initialize `Ethereum Antenna`;
After initialization, you can listen event with this instance.

## Deep dive into Ethereum Antenna
### Initialization
To run `Ethereum Antenna`, you should add parameters to create instance. Below is description of parameters.
| Name | Type | Required | Default | Description |
|---|---|---|---|---|
|eventSync|boolean|false|undefined|listening event with sync or async|
|eventStore.type|`mongodb`|true||type of persistence|
|eventStore.url|string|true||url of persistence|
|producer.type|`sqs`|true||type of event publisher|
|producer.fifo|boolean|false|undefined|`true` if event queue is `FIFO` queue|
|producer.region|string|true||region of event publisher, currently only affected on AWS|
|producer.queueUrl|string|true||queue url of event publisher|
|http.type|`koa`|true||type of http service|
|http.port|number|false|3000|port number of http service|
|http.prefix|string|false||prefix of routing url|
|rpc|string|true||url of EVM chain RPC|
|delayBlock|string|false|0|distance from latest block number|
|backOffBlock|string|false|50|range from specific block number|

If `eventSync` is true, event listening and broadcasting will occur synchronous. If some events are delayed from other events, wait until delayed events follow event block.
If `eventSync` is false, event listening asynchronously and event query parallelly.

> Notice:
If you have to use AWS SQS on outside of AWS infrastructure, you **SHOULD WRITE** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. ([LINK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-environment.html))
If you're using AWS SQS on infrastructure, follow AWS guide to get grant to send SQS Messages.

### Methods
`Ethereum Antenna` includes two features. First one is listening event from blockchain. Another one helps event structure that uses on block event listener by handling it with REST api.
- `antenna.run()`
run event listener and helper API both.
- `antenna.listen()`
run event listener only.
- `antenna.api()`
run helper API only.

## Todo
Below list may change due to our direction of development

* create test cases
* add api interface for contract listening
* add contribution guide