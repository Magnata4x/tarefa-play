import { queryOptions } from "@tanstack/react-query";
import { getWorkspace } from "./workspace.functions";

export const workspaceQuery = queryOptions({ queryKey: ["workspace"], queryFn: () => getWorkspace(), staleTime: 15_000 });
export type Workspace = Awaited<ReturnType<typeof getWorkspace>>;