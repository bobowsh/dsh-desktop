import { tavilySearch } from "./tavily.js";
export const name = "dsh-plugin-search";
export const inject = ["web"];
export const PROVIDER_ID = "simple-search";
function resolveApiKey() {
    const key = process.env.TAVILY_API_KEY?.trim();
    return key ? key : undefined;
}
export function apply(ctx) {
    ctx.web.registerSearchProvider({
        id: PROVIDER_ID,
        available: () => true,
        search: (request, signal) => tavilySearch({
            query: request.query,
            maxResults: request.maxResults,
            apiKey: resolveApiKey(),
            signal,
        }),
    });
}
