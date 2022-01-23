type Function = (...args: any[]) => Promise<any>;


class Job {
  func: Function;
  key: string;
  lock: boolean;
  
  constructor(func: Function, key: string = '') {
    this.func = func;
    this.key = key || func.name;
    this.lock = false;
  }
  
  async run(...args: any[]) {
    if (this.lock) {
      return;
    }
    
    this.lock = true;
    await this.func(...args)
      .finally(() => {
        this.lock = false;
      });
  }
}

const jobs: Record<string, Job> = {};

export function Atomic(func: Function, key?: string) {
  key = key || func.name;
  if (jobs[key]) {
    return jobs[key];
  }

  jobs[key] = new Job(func, key);
  return jobs[key];
};
