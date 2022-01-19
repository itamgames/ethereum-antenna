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

## How to install
1. install dependencies
Ethereum Event listener use yarn as package manager
```javascript
$ yarn install ethereum-antenna
```
you can use npm alternatively
```javascript
$ npm install ethereum-antenna
```
2. setup environment variables
Some environment variables used in code are not opened to repository.
So you should write `.env` file. 
```env
NODE_HTTP_PROVIDER = https://bsc-dataseed.binance.org/
```

## Todo
Below list may change due to our direction of development
- [ ] create test cases
- [ ] add api interface for contract listening