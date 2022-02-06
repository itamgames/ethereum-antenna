import Web3 from 'web3';
import { Contract as Web3Contract } from 'web3-eth-contract';
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
  const [contracts, currentBlockNumber] = await Promise.all([
    eventStore.getContracts(),
    web3.eth.getBlockNumber(),
  ]);

  const trackedBlock: Record<string, number> = {};
  const blockTimestamp: Record<number, number> = {};
  const run = async (contract: Contract, web3ContractObj: Web3Contract) => {
    const fromBlock = trackedBlock[contract.contractAddress] - backOffBlock;
    let toBlock = trackedBlock[contract.contractAddress] + threshold;
    if (toBlock > currentBlockNumber - delayBlock) {
      toBlock = currentBlockNumber - delayBlock;
    }
    if (fromBlock >= toBlock) {
      return;
    }

    const events = await web3ContractObj.getPastEvents('allEvents', {
      fromBlock,
      toBlock,
    });

    const broadcastMessages: QueueMessage[] = await Promise.all(
      events.map(async (event) => {
        if (!blockTimestamp[event.blockNumber]) {
          const block = await web3.eth.getBlock(event.blockNumber, false);
          blockTimestamp[event.blockNumber] = typeof block.timestamp === 'string' ? Number(block.timestamp) : block.timestamp;
        }

        return {
          id: `${event.transactionHash}-${event.logIndex}`,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
          contractAddress: contract.contractAddress,
          event: event.event,
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
  };

  for (const contract of contracts) {
    const lastBlockNumber = contract.blockNumber || currentBlockNumber;
    trackedBlock[contract.contractAddress] = lastBlockNumber - backOffBlock;

    const contractObj = new web3.eth.Contract(
      contract.abi,
      contract.contractAddress,
    );

    setInterval(function () {
      run(contract, contractObj);
    }, blockPerSecond * 1000);
  }
}

export default listenBlockchain;
