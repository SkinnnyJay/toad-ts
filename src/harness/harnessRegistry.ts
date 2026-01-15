import type { HarnessAdapter } from "@/harness/harnessAdapter";
import type { HarnessConfig } from "@/harness/harnessConfig";

export class HarnessRegistry<TConfig extends HarnessConfig = HarnessConfig> {
  private readonly adapters = new Map<string, HarnessAdapter<TConfig>>();

  public constructor(adapters?: Iterable<HarnessAdapter<TConfig>>) {
    if (adapters) {
      for (const adapter of adapters) {
        this.register(adapter);
      }
    }
  }

  public register(adapter: HarnessAdapter<TConfig>): void {
    this.adapters.set(adapter.id, adapter);
  }

  public get(id: string): HarnessAdapter<TConfig> | undefined {
    return this.adapters.get(id);
  }

  public has(id: string): boolean {
    return this.adapters.has(id);
  }

  public list(): HarnessAdapter<TConfig>[] {
    return Array.from(this.adapters.values());
  }
}
