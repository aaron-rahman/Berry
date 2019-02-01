import {FakeFS, NodeFS}    from '@berry/fslib';
import {parseResolution}   from '@berry/parsers';
import {posix}             from 'path';
import semver              from 'semver';

import * as structUtils    from './structUtils';
import {IdentHash}         from './types';
import {Ident, Descriptor} from './types';

export interface WorkspaceDefinition {
  pattern: string;
};

export interface DependencyMeta {
  built?: boolean;
  unplugged?: boolean;
};

export interface PeerDependencyMeta {
  optional?: boolean;
};

export class Manifest {
  public name: Ident | null = null;
  public version: string | null = null;

  public bin: Map<string, string> = new Map();
  public scripts: Map<string, string> = new Map();

  public dependencies: Map<IdentHash, Descriptor> = new Map();
  public devDependencies: Map<IdentHash, Descriptor> = new Map();
  public peerDependencies: Map<IdentHash, Descriptor> = new Map();

  public workspaceDefinitions: Array<WorkspaceDefinition> = [];

  public dependenciesMeta: Map<IdentHash, Map<string, DependencyMeta>> = new Map();
  public peerDependenciesMeta: Map<IdentHash, Map<string, PeerDependencyMeta>> = new Map();

  public resolutions: Array<{pattern: any, reference: string}> = [];

  static async find(path: string, {baseFs = new NodeFS()}: {baseFs?: FakeFS} = {}) {
    return await Manifest.fromFile(posix.join(path, `package.json`), {baseFs});
  }

  static async fromFile(path: string, {baseFs = new NodeFS()}: {baseFs?: FakeFS} = {}) {
    const manifest = new Manifest();
    await manifest.loadFile(path, {baseFs});

    return manifest;
  }

  async loadFile(path: string, {baseFs = new NodeFS()}: {baseFs?: FakeFS}) {
    const content = await baseFs.readFilePromise(path, `utf8`);
    const data = JSON.parse(content);

    this.load(data);
  }

  load(data: any) {
    if (typeof data !== `object` || data === null)
      throw new Error(`Utterly invalid manifest data (${data})`);

    const errors: Array<Error> = [];

    if (typeof data.name === `string`) {
      try {
        this.name = structUtils.parseIdent(data.name);
      } catch (error) {
        errors.push(new Error(`Parsing failed for the 'name' field`));
      }
    }

    if (typeof data.version === `string`)
      this.version = data.version;

    if (typeof data.bin === `string`) {
      if (this.name !== null) {
        this.bin = new Map([[structUtils.stringifyIdent(this.name), data.bin]]);
      } else {
        errors.push(new Error(`String bin field, but no attached package name`));
      }
    } else if (typeof data.bin === `object` && data.bin !== null) {
      for (const [key, value] of Object.entries(data.bin)) {
        if (typeof value !== `string`) {
          errors.push(new Error(`Invalid bin definition for '${key}'`));
          continue;
        }

        this.bin.set(key, value);
      }
    }

    if (typeof data.scripts === `object` && data.scripts !== null) {
      for (const [key, value] of Object.entries(data.scripts)) {
        if (typeof value !== `string`) {
          errors.push(new Error(`Invalid script definition for '${key}'`));
          continue;
        }

        this.scripts.set(key, value);
      }
    }

    if (typeof data.dependencies === `object` && data.dependencies !== null) {
      for (const [name, range] of Object.entries(data.dependencies)) {
        if (typeof range !== 'string') {
          errors.push(new Error(`Invalid dependency range for '${name}'`));
          continue;
        }

        let ident;
        try {
          ident = structUtils.parseIdent(name);
        } catch (error) {
          errors.push(new Error(`Parsing failed for the dependency name '${name}'`));
          continue;
        }

        const descriptor = structUtils.makeDescriptor(ident, range);
        this.dependencies.set(descriptor.identHash, descriptor);
      }
    }

    if (typeof data.devDependencies === `object` && data.devDependencies !== null) {
      for (const [name, range] of Object.entries(data.devDependencies)) {
        if (typeof range !== 'string') {
          errors.push(new Error(`Invalid dependency range for '${name}'`));
          continue;
        }

        let ident;
        try {
          ident = structUtils.parseIdent(name);
        } catch (error) {
          errors.push(new Error(`Parsing failed for the dependency name '${name}'`));
          continue;
        }

        const descriptor = structUtils.makeDescriptor(ident, range);
        this.devDependencies.set(descriptor.identHash, descriptor);
      }
    }

    if (typeof data.peerDependencies === `object` && data.peerDependencies !== null) {
      for (const [name, range] of Object.entries(data.peerDependencies)) {
        if (typeof range !== 'string') {
          errors.push(new Error(`Invalid dependency range for '${name}'`));
          continue;
        }

        let ident;
        try {
          ident = structUtils.parseIdent(name);
        } catch (error) {
          errors.push(new Error(`Parsing failed for the dependency name '${name}'`));
          continue;
        }

        const descriptor = structUtils.makeDescriptor(ident, range);
        this.peerDependencies.set(descriptor.identHash, descriptor);
      }
    }

    const workspaces = Array.isArray(data.workspaces)
      ? data.workspaces
      : typeof data.workspaces === `object` && data.workspaces !== null && Array.isArray(data.workspaces.packages)
        ? data.workspaces.packages
        : [];

    for (const entry of workspaces) {
      if (typeof entry !== `string`) {
        errors.push(new Error(`Invalid workspace definition for '${entry}'`));
        continue;
      }

      this.workspaceDefinitions.push({
        pattern: entry,
      });
    }

    if (typeof data.dependenciesMeta === `object` && data.dependenciesMeta !== null) {
      for (const [pattern, meta] of Object.entries(data.dependenciesMeta)) {
        if (typeof meta !== `object` || meta === null) {
          errors.push(new Error(`Invalid meta field for '${pattern}`));
          continue;
        }

        const descriptor = structUtils.parseDescriptor(pattern);
        if (descriptor.range !== `unknown` && !semver.valid(descriptor.range)) {
          errors.push(new Error(`Invalid meta field range for '${pattern}'`));
          continue;
        }

        let dependencyMetaSet = this.dependenciesMeta.get(descriptor.identHash);
        if (!dependencyMetaSet)
          this.dependenciesMeta.set(descriptor.identHash, dependencyMetaSet = new Map());
        
        dependencyMetaSet.set(descriptor.range, meta);
      }
    }

    if (typeof data.peerDependenciesMeta === `object` && data.peerDependenciesMeta !== null) {
      for (const [pattern, meta] of Object.entries(data.peerDependenciesMeta)) {
        if (typeof meta !== `object` || meta === null) {
          errors.push(new Error(`Invalid meta field for '${pattern}`));
          continue;
        }

        const descriptor = structUtils.parseDescriptor(pattern);
        if (descriptor.range !== `unknown` && !semver.valid(descriptor.range)) {
          errors.push(new Error(`Invalid meta field range for '${pattern}'`));
          continue;
        }

        let peerDependencyMetaSet = this.peerDependenciesMeta.get(descriptor.identHash);
        if (!peerDependencyMetaSet)
          this.peerDependenciesMeta.set(descriptor.identHash, peerDependencyMetaSet = new Map());
        
        peerDependencyMetaSet.set(descriptor.range, meta);
      }
    }

    if (typeof data.resolutions === `object` && data.resolutions !== null) {
      for (const [pattern, reference] of Object.entries(data.resolutions)) {
        if (typeof reference !== `string`) {
          errors.push(new Error(`Invalid resolution entry for '${pattern}'`));
          continue;
        }

        try {
          this.resolutions.push({pattern: parseResolution(pattern), reference});
        } catch (error) {
          errors.push(error);
          continue;
        } 
      }
    }

    return errors;
  }

  exportTo(data: {[key: string]: any}) {
    if (this.name !== null)
      data.name = structUtils.stringifyIdent(this.name);
    else
      delete data.name;

    if (this.version !== null)
      data.version = this.version;
    else
      delete data.version;

    data.dependencies = this.dependencies.size === 0 ? undefined : Object.assign({}, ... structUtils.sortDescriptors(this.dependencies.values()).map(dependency => {
      return {[structUtils.stringifyIdent(dependency)]: dependency.range};
    }));

    data.devDependencies = this.devDependencies.size === 0 ? undefined : Object.assign({}, ... structUtils.sortDescriptors(this.devDependencies.values()).map(dependency => {
      return {[structUtils.stringifyIdent(dependency)]: dependency.range};
    }));

    data.peerDependencies = this.peerDependencies.size === 0 ? undefined : Object.assign({}, ... structUtils.sortDescriptors(this.peerDependencies.values()).map(dependency => {
      return {[structUtils.stringifyIdent(dependency)]: dependency.range};
    }));
  }
};
