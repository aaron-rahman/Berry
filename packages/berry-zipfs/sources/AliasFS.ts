import {posix}  from 'path';

import {FakeFS} from './FakeFS';

export type AliasFSOptions = {
  baseFs: FakeFS,
};

export class AliasFS extends FakeFS {
  private readonly target: string;

  private readonly baseFs: FakeFS;

  constructor(target: string, {baseFs}: AliasFSOptions) {
    super();

    this.target = target;
    this.baseFs = baseFs;
  }

  getRealPath() {
    return this.target;
  }

  createReadStream(p: string, opts: {encoding?: string}) {
    return this.baseFs.createReadStream(p, opts);
  }

  async realpathPromise(p: string) {
    return await this.baseFs.realpathPromise(p);
  }

  realpathSync(p: string) {
    return this.baseFs.realpathSync(p);
  }

  async existsPromise(p: string) {
    return await this.baseFs.existsPromise(p);
  }

  existsSync(p: string) {
    return this.baseFs.existsSync(p);
  }

  async statPromise(p: string) {
    return await this.baseFs.statPromise(p);
  }

  statSync(p: string) {
    return this.baseFs.statSync(p);
  }

  async lstatPromise(p: string) {
    return await this.baseFs.lstatPromise(p);
  }

  lstatSync(p: string) {
    return this.baseFs.lstatSync(p);
  }

  async writeFilePromise(p: string, content: Buffer | string) {
    return await this.baseFs.writeFilePromise(p, content);
  }

  writeFileSync(p: string, content: Buffer | string) {
    return this.baseFs.writeFileSync(p, content);
  }
  
  async mkdirPromise(p: string) {
    return await this.baseFs.mkdirPromise(p);
  }

  mkdirSync(p: string) {
    return this.baseFs.mkdirSync(p);
  }

  async symlinkPromise(target: string, p: string) {
    return await this.baseFs.symlinkPromise(target, p);
  }

  symlinkSync(target: string, p: string) {
    return this.baseFs.symlinkSync(target, p);
  }

  readFilePromise(p: string, encoding: 'utf8'): Promise<string>;
  readFilePromise(p: string, encoding?: string): Promise<Buffer>;
  async readFilePromise(p: string, encoding?: string) {
    // This weird switch is required to tell TypeScript that the signatures are proper (otherwise it thinks that only the generic one is covered)
    switch (encoding) {
      case `utf8`:
        return await this.baseFs.readFilePromise(p, encoding);
      default:
        return await this.baseFs.readFilePromise(p, encoding);
    }
  }

  readFileSync(p: string, encoding: 'utf8'): string;
  readFileSync(p: string, encoding?: string): Buffer;
  readFileSync(p: string, encoding?: string) {
    // This weird switch is required to tell TypeScript that the signatures are proper (otherwise it thinks that only the generic one is covered)
    switch (encoding) {
      case `utf8`:
        return this.baseFs.readFileSync(p, encoding);
      default:
        return this.baseFs.readFileSync(p, encoding);
    }
  }

  async readdirPromise(p: string) {
    return await this.baseFs.readdirPromise(p);
  }

  readdirSync(p: string) {
    return this.baseFs.readdirSync(p);
  }

  async readlinkPromise(p: string) {
    return await this.baseFs.readlinkPromise(p);
  }

  readlinkSync(p: string) {
    return this.baseFs.readlinkSync(p);
  }
}
