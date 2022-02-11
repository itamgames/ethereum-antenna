import { Atomic } from '../utils';
import Web3 from 'web3';
import { Contract as Web3Contract } from 'web3-eth-contract';
import { v4 as uuidv4 } from 'uuid';
import { Contract, IEventStore } from '../eventStore/interface';
import { IProducer, QueueMessage } from '../producer/interface';

type ListenBlockChainType = {
  rpc: string;
  delayBlock: number;
  blockPerSecond: number;
  backOffBlock: number;
  threshold: number;
  limit: number;
  eventStore: IEventStore;
  producer: IProducer;
};

async function listenBlockchain({
  rpc,
  delayBlock,
  blockPerSecond,
  backOffBlock,
  threshold,
  eventStore,
  producer,
}: ListenBlockChainType) {
  const web3 = new Web3(rpc);
  const contracts = await eventStore.getContracts();

  const trackedBlock: Record<string, number> = {};
  const blockTimestamp: Record<number, number> = {};
  const run = async (contract: Contract, web3ContractObj: Web3Contract) => {
    try {
      const currentBlockNumber = await web3.eth.getBlockNumber();
      const fromBlock = trackedBlock[contract.contractAddress] - backOffBlock;
      let toBlock = trackedBlock[contract.contractAddress] + threshold;
      if (toBlock > currentBlockNumber - delayBlock) {
        toBlock = currentBlockNumber - delayBlock;
      }
      if (fromBlock >= toBlock) {
        return;
      }
  
      const events = await web3ContractObj.getPastEvents("allEvents", {
        fromBlock,
        toBlock,
      });
  
      const broadcastMessages: QueueMessage[] = await Promise.all(
        events.map(async (event) => {
          if (!blockTimestamp[event.blockNumber]) {
            const block = await web3.eth.getBlock(event.blockNumber, false);
            blockTimestamp[event.blockNumber] = typeof block.timestamp === 'string' ? Number(block.timestamp) : block.timestamp;
          }
  
          const id = uuidv4();
          return {
            id,
            transactionHash: event.transactionHash,
            logIndex: event.logIndex,
            contractAddress: contract.contractAddress,
            event: event.event!,
            params: event.returnValues,
            options: contract.options,
            blockNumber: event.blockNumber,
            blockCreatedAt: new Date(blockTimestamp[event.blockNumber] * 1000),
          };
        }),
      );
  
      await producer.broadcast(broadcastMessages);
      await eventStore.updateBlock(contract.contractAddress, toBlock);
      trackedBlock[contract.contractAddress] = toBlock;
    } catch (err) {
      console.error('Blockchain Event Sync Error:', err);
    }
  };

  for (const contract of contracts) {
    const lastBlockNumber = contract.blockNumber || await web3.eth.getBlockNumber();
    trackedBlock[contract.contractAddress] = lastBlockNumber - backOffBlock;

    const contractObj = new web3.eth.Contract(
      contract.abi,
      contract.contractAddress,
    );

    setInterval(async function () {
      const atomic = Atomic(run, contract.contractAddress);
      await atomic.run(contract, contractObj);
    }, blockPerSecond * 1000);
  }
}

export default listenBlockchain;
