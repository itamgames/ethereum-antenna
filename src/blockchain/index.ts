import { id } from '@ethersproject/hash';
import { Contract as ContractType } from 'ethers';
import { AbiItem, Contract as ContractSchema, IEventStore } from '../eventStore/interface';
import { IProducer, QueueMessage } from '../producer/interface';
import { ethersProvider, Contract, bigNumberToString, sleep } from '../utils';
import { Provider } from '@ethersproject/providers';
import asyncPool from "tiny-async-pool";

const blockDates: Record<number, Date> = {};

type QueryType = { 
  blockNumber: number;
  lastBlockNumber: number;
  threshold: number;
  eventContract: ContractType;
  provider: Provider;
  event: ContractSchema['events'][0];
  contractAddress: string;
  options?: Record<string, unknown>;
}

async function query ({ blockNumber, lastBlockNumber, threshold, eventContract, provider, event, contractAddress, options }: QueryType) {
  const toBlock = Math.min(blockNumber + threshold, lastBlockNumber);

  const lists = await eventContract.queryFilter({ topics: [id(event.format)] }, blockNumber, toBlock).catch((err) => {
    console.error(err);
    return [];
  });
  if (lists.length === 0) {
    return;
  }

  // get unique blockDates
  const blockNumbers = lists.map((item) => item.blockNumber).filter((item, index, self) => self.indexOf(item) === index);
  await Promise.all(
    blockNumbers.map(async (blockNumber) => {
      if (blockDates[blockNumber]) {
        return;
      }
      const block = await provider.getBlock(blockNumber).catch(console.error);
      if (block) {
        blockDates[blockNumber] = new Date(block.timestamp * 1000);
      }
    })
  );

  const formattedLists = lists.map((el) => ({ name: event.abi.name, args: el?.args, transactionHash: el.transactionHash, logIndex: el.logIndex, blockNumber: el.blockNumber, blockCreatedAt: blockDates[el.blockNumber] }));
  // console.log(event.abi.name, blockNumber, toBlock, formattedLists.length ?? undefined);

  const contractEvents = formattedLists.map((item) => {
    const transactionHash = item.transactionHash;
    const logIndex = item.logIndex;
    const args = event.abi.inputs?.reduce((obj: Record<string, string | number>, input) => {
      const name = input.name;
      obj[name] = bigNumberToString(item.args?.[name]);
      return obj;
    }, {});

    return {
      id: `${transactionHash}-${logIndex}`,
      transactionHash,
      logIndex,
      contractAddress,
      params: args, // fromAddress, toAddress, paymentContract, price, fee, itemId?, amount?
      options,
      event: item.name || event.abi.name,
      blockNumber: item.blockNumber,
      blockCreatedAt: item.blockCreatedAt,
    }
  });

  return contractEvents;
}

type SyncType = {
  contract: ContractSchema;
  eventSync?: boolean;
  rpc: string;
  delayBlock: number;
  backOffBlock: number;
  threshold: number;
  limit: number;
  eventStore: IEventStore;
  producer: IProducer;
}

async function syncer({ contract, eventSync, rpc, delayBlock, backOffBlock, threshold, limit, eventStore, producer }: SyncType) {
  try {
    const ABI = contract.events.reduce((acc: AbiItem[], evt) => acc.concat(evt.abi), []);
    const contractAddress = contract.address;
    const provider = ethersProvider(rpc);
    const eventContract = Contract(ABI, contractAddress, rpc);
    const currentBlockNumber = await provider.getBlockNumber();
    // HACK: prevent event missing
    const lastBlockNumber = currentBlockNumber - delayBlock;
    let messages: QueueMessage[] = [];
    await Promise.all(contract.events.map(async (event) => {
      let fromBlock = event.trackedBlock;
      let i = 0;
      do {
        try {
          const block = Math.min(lastBlockNumber - fromBlock, threshold);
          const arrays = Array(block).fill(0).map((_, index) => fromBlock - backOffBlock + index);
          await asyncPool(threshold, arrays, async (blockNumber) => {
            const trackingBlock = blockNumber + threshold;
            const result = await query({ blockNumber, lastBlockNumber, threshold, eventContract, provider, event, contractAddress, options: contract.options });
            if (result) {
              messages = messages.concat(result);
            }
            if (!eventSync) {
              // log for [blocknumber, event]
              // console.log(trackingBlock, event.abi.name);
              if (messages.length > 0) {
                // log for [blocknumber, events, count]
                console.log(
                  trackingBlock,
                  messages.map((msg) => (msg.event)).filter((elem, index, self) => self.indexOf(elem) === index),
                  messages.map((msg) => (msg.options?.callbackURL)).filter((elem, index, self) => self.indexOf(elem) === index),
                  messages.length
                );
                await producer.broadcast(messages);
                messages = [];
              }
            }
          });
          i++;
          fromBlock += threshold;
          // log for [blocknumber, event]
          // console.log(i, fromBlock, event.abi.name);
          await eventStore.updateBlock(contractAddress, event.abi.name, Math.min(fromBlock, lastBlockNumber));
        } catch (err: any) {
          if (!!err?.body && JSON.parse(err?.body)?.error?.message === 'too many requests') {
            console.error(JSON.parse(err?.body)?.error?.message);
          } else {
            console.error(err);
          }
        }
      } while (fromBlock <= lastBlockNumber && i < Math.floor(limit/threshold));
    }));
    if (eventSync && messages.length > 0) {
      const sortBy = contract.events.map((evt) => evt.abi.name);
      const sortByObject = sortBy.reduce((a: Record<string, number>,c,i) => {
        a[c] = i
        return a
      }, {});
      messages.sort((a, b) => {
        if (a.blockNumber < b.blockNumber) return 1;
        if (a.blockNumber > b.blockNumber) return -1;

        if (sortByObject[a.event] > sortByObject[b.event]) return 1;
        if (sortByObject[a.event] < sortByObject[b.event]) return -1;
        return 0;
      });
      // log for [blocknumber, events, count]
      console.log(
        messages.map((msg) => (msg.blockNumber)).reduce((acc, cur) => Math.min(acc, cur), Infinity),
        messages.map((msg) => (msg.event)).filter((elem, index, self) => self.indexOf(elem) === index),
        messages.map((msg) => (msg.options?.callbackURL)).filter((elem, index, self) => self.indexOf(elem) === index),
        messages.length
      );
      await producer.broadcast(messages);
      messages = [];
    }
  } catch (err) {
    console.error('contract loop error: ', err);
  }
}

type ListenBlockChainType = {
  eventSync?: boolean;
  rpc: string;
  delayBlock: number;
  blockPerSecond: number;
  backOffBlock: number;
  threshold: number;
  limit: number;
  eventStore: IEventStore;
  producer: IProducer;
}

async function listenBlockchain({ eventSync, rpc, delayBlock, blockPerSecond, backOffBlock, threshold, limit, eventStore, producer }: ListenBlockChainType) {
  async function run() {
    console.log('run');
    const contracts = await eventStore.getContracts();

    await Promise.all(contracts.map(async (contract) => {
      // const atomic = Atomic(syncer, contract.address);
      // await atomic.run(...args);
      await syncer({ contract, eventSync, rpc, delayBlock, backOffBlock, threshold, limit, eventStore, producer });
    })).catch(async(err) => {
      console.error(err);
    });
  }
  while (true) {
    await run();
    await sleep(blockPerSecond * 1000);
  }
}

export default listenBlockchain;
