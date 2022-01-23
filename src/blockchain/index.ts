import { id } from '@ethersproject/hash';
import { Contract as ContractType } from 'ethers';
import cron from 'node-cron';
import { AbiItem, Contract as ContractSchema, IEventStore } from '../eventStore/interface';
import { IProducer, QueueMessage } from '../producer/interface';
import { ethersProvider, Contract, bigNumberToString } from '../../src/utils';
import Atomic from '../utils/atomic';
import { Provider } from '@ethersproject/providers';
import asyncPool from "tiny-async-pool";

const blockDates: Record<number, Date> = {};

type QueryType = { 
  blockNumber: number;
  lastBlockNumber: number;
  backOffBlock: number;
  eventContract: ContractType;
  provider: Provider;
  event: ContractSchema['events'][0];
  contractAddress: string;
  options?: Record<string, unknown>;
}

async function query ({ blockNumber, lastBlockNumber, backOffBlock, eventContract, provider, event, contractAddress, options }: QueryType) {
  const toBlock = Math.min(blockNumber + backOffBlock, lastBlockNumber);

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
  rpc: string;
  eventSync?: boolean;
  delayBlock: number;
  backOffBlock: number;
  eventStore: IEventStore;
  producer: IProducer;
}

async function syncer({ contract, eventSync, rpc, delayBlock, backOffBlock, eventStore, producer }: SyncType) {
  try {
    const ABI = contract.events.reduce((acc: AbiItem[], evt) => acc.concat(evt.abi), []);
    const contractAddress = contract.address;
    const provider = ethersProvider(rpc);
    const eventContract = Contract(ABI, contractAddress, rpc);
    const currentBlockNumber = await provider.getBlockNumber();
    // HACK: prevent event missing
    const lastBlockNumber = currentBlockNumber - delayBlock;
    if (eventSync) {
      let syncBlock = contract.events.reduce((acc, cur) => Math.min(acc, cur.trackedBlock), lastBlockNumber);
      let fromBlock = syncBlock;
      do {
        let messages: QueueMessage[] = [];
        try {
          const arrays = Array(backOffBlock).fill(0).map((_, index) => fromBlock - backOffBlock + index);
          for (const blockNumber of arrays) {
            const trackingBlock = blockNumber + backOffBlock;
            const sortBy = contract.events.map((evt) => evt.format.split('(')[0]);
            await Promise.all(contract.events.map(async (event) => {
              if (event.trackedBlock > syncBlock) {
                return;
              }
              // log for [blocknumber, event]
              // console.log(trackingBlock, event.abi.name);
              const result = await query({ blockNumber, lastBlockNumber, backOffBlock, eventContract, provider, event, contractAddress, options: contract.options });
              if (result) {
                messages = messages.concat(result);
              }
              const sortByObject = sortBy.reduce((a: Record<string, number>,c,i) => {
                a[c] = i
                return a
              }, {});
              if (messages.length > 0) {
                messages.sort((a, b) => sortByObject[a.event] - sortByObject[b.event]);
                // log for [blocknumber, events, count]
                console.log(
                  trackingBlock,
                  messages.map((msg) => (msg.event)).filter((elem, index, self) => self.indexOf(elem) === index),
                  messages.map((msg) => (msg.options?.callbackURL)).filter((elem, index, self) => self.indexOf(elem) === index),
                  messages.length
                );
                await producer.broadcast(messages, 10);
                messages = [];
              }
              await eventStore.updateBlock(contractAddress, event.abi.name, Math.min(trackingBlock, lastBlockNumber));
              if (syncBlock < trackingBlock) {
                syncBlock = trackingBlock;
              }
            }));
          }
          fromBlock += backOffBlock;
        } catch (err: any) {
          if (!!err?.body && JSON.parse(err?.body)?.error?.message === 'too many requests') {
            console.error(JSON.parse(err?.body)?.error?.message);
          } else {
            console.error(err);
          }
        }
      } while (fromBlock <= lastBlockNumber);
    } else {
      await Promise.all(contract.events.map(async (event) => {
        let fromBlock = event.trackedBlock;
        do {
          try {
            const arrays = Array(backOffBlock).fill(0).map((_, index) => fromBlock - backOffBlock + index);
            await asyncPool(10, arrays, async (blockNumber) => {
              const trackingBlock = blockNumber + backOffBlock;
              // log for [blocknumber, event]
              // console.log(trackingBlock, event.abi.name);
              const sortBy = contract.events.map((evt) => evt.format.split('(')[0]);
              const result = await query({ blockNumber, lastBlockNumber, backOffBlock, eventContract, provider, event, contractAddress, options: contract.options });
              let messages: QueueMessage[] = [];
              if (result) {
                messages = messages.concat(result);
              }
              const sortByObject = sortBy.reduce((a: Record<string, number>,c,i) => {
                a[c] = i
                return a
              }, {});
              if (messages.length > 0) {
                messages.sort((a, b) => sortByObject[a.event] - sortByObject[b.event]);
                // log for [blocknumber, events, count]
                console.log(
                  trackingBlock,
                  messages.map((msg) => (msg.event)).filter((elem, index, self) => self.indexOf(elem) === index),
                  messages.map((msg) => (msg.options?.callbackURL)).filter((elem, index, self) => self.indexOf(elem) === index),
                  messages.length
                );
                await producer.broadcast(messages, 10);
              }
            });
            fromBlock += backOffBlock;
            await eventStore.updateBlock(contractAddress, event.abi.name, Math.min(fromBlock, lastBlockNumber));
          } catch (err: any) {
            if (!!err?.body && JSON.parse(err?.body)?.error?.message === 'too many requests') {
              console.error(JSON.parse(err?.body)?.error?.message);
            } else {
              console.error(err);
            }
          }
        } while (fromBlock <= lastBlockNumber);
      }));
    }
  } catch (err) {
    console.error('contract loop error: ', err);
  }
}

type ListenBlockChainType = {
  type: 'standalone' | 'depend';
  eventSync?: boolean;
  rpc: string;
  blockPerSecond?: number;
  delayBlock: number;
  backOffBlock: number;
  eventStore: IEventStore;
  producer: IProducer;
}

async function listenBlockchain({ type, eventSync, rpc, blockPerSecond, delayBlock, backOffBlock, eventStore, producer }: ListenBlockChainType) {
  const contracts = await eventStore.getContracts();

  if (type === 'standalone') {
    cron.schedule(`*/${blockPerSecond} * * * * *`, async () => {
      contracts.forEach(async (contract) => {
        const atomic = Atomic(syncer, contract.address);
        await atomic.run({ contract, eventSync, rpc, delayBlock, backOffBlock, eventStore, producer });
      });
    });
  } else {
    async function run() {
      console.log('run');
      await Promise.all(contracts.map(async (contract) => {
        const atomic = Atomic(syncer, contract.address);
        await atomic.run({ contract, eventSync, rpc, delayBlock, backOffBlock, eventStore, producer });
      }));
    }
    while (true) {
      await run();
    }
  }
}

export default listenBlockchain;
