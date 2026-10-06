export interface ResearchHit {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

export interface ResearchIO {
  search(query: string, signal: AbortSignal): Promise<readonly ResearchHit[]>;
  readPage(url: string, signal: AbortSignal): Promise<string>;
}

export interface ResearchEffect {
  readonly text: string;
}

export interface ResearchTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Readonly<Record<string, { readonly type: 'string'; readonly description: string }>>;
    readonly required: readonly string[];
  };
}
