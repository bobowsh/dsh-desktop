import { type AgentRecord, type AgentRouteRemap, type AgentTeamRecipeDocument, type RecipeConflict, type RecipeMissingRoute } from '../types.ts';
export interface ExistingRecipeDefinitions {
    readonly agents: ReadonlyMap<string, AgentRecord>;
    readonly squads: ReadonlyMap<string, {
        readonly name: string;
    }>;
}
/** Parse, remap, and cross-reference one untrusted recipe without writing storage. */
export declare function prepareRecipe(document: unknown, routeRemap?: Readonly<Record<string, AgentRouteRemap>>): AgentTeamRecipeDocument;
export declare function findRecipeConflicts(recipe: AgentTeamRecipeDocument, existing: ExistingRecipeDefinitions): RecipeConflict[];
export declare function findMissingRecipeRoutes(recipe: AgentTeamRecipeDocument, resolve: (provider: string, model: string) => Promise<unknown>, signal?: AbortSignal): Promise<RecipeMissingRoute[]>;
/** Copy policy mints a closed identity graph; no imported row can overwrite an existing definition. */
export declare function copyRecipeIds(recipe: AgentTeamRecipeDocument, createId: () => string): AgentTeamRecipeDocument;
//# sourceMappingURL=recipes.d.ts.map