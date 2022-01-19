import { ethers, Contract as EthersContract, BigNumber } from 'ethers';

const providers: Record<string, ethers.providers.Provider> = {};

export function ethersProvider(rpcURL: string) {
  if (providers[rpcURL]) {
    return providers[rpcURL];
  }
  providers[rpcURL] = new ethers.providers.JsonRpcProvider(rpcURL);
  return providers[rpcURL];
}

const contracts: Record<string, EthersContract> = {};

export function Contract(abi: any, address: string, rpcURL: string) {
  if (contracts[address]) {
      return contracts[address];
  }

  const provider = ethersProvider(rpcURL);
  contracts[address] = new EthersContract(address, abi, provider);
  return contracts[address];
}

export function formatEther(wei: ethers.BigNumberish) {
  return ethers.utils.formatEther(wei);
}

export function bigNumberToString(value: any) {
  return BigNumber.isBigNumber(value) ? value.toString() : value;
}