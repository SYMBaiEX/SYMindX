export interface HostResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
}

export interface HostRequest {
  readonly method: 'POST';
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly signal: AbortSignal;
}

export interface HostFetch {
  (url: string, init: HostRequest): Promise<HostResponse>;
}

export interface ExtensionInfo {
  readonly id: 'slack' | 'twitter' | 'runelite' | 'direct';
  readonly name: string;
  readonly actions: readonly string[];
}
