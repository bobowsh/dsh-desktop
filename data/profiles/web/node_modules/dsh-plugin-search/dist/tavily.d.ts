export declare const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
export interface SearchSource {
    url: string;
    title?: string;
    snippet?: string;
    publishedAt?: string;
}
export interface SearchResult {
    sources: SearchSource[];
    truncated: boolean;
    content?: string;
}
export interface TavilyRequest {
    query: string;
    maxResults?: number;
    apiKey?: string;
    signal?: AbortSignal;
}
export declare function searchHeaders(apiKey?: string): Record<string, string>;
export declare function searchBody(query: string, maxResults?: number): string;
export declare function mapTavilyResponse(body: unknown): SearchResult;
export declare function tavilySearch(request: TavilyRequest): Promise<SearchResult>;
