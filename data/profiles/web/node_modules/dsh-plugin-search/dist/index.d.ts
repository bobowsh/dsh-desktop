export declare const name = "dsh-plugin-search";
export declare const inject: string[];
export declare const PROVIDER_ID = "simple-search";
interface WebSearchRequest {
    query: string;
    maxResults?: number;
}
interface WebRuntime {
    registerSearchProvider(provider: {
        id: string;
        available(): boolean;
        search(request: WebSearchRequest, signal?: AbortSignal): Promise<unknown>;
    }): unknown;
}
interface DshContext {
    web: WebRuntime;
}
export declare function apply(ctx: DshContext): void;
export {};
