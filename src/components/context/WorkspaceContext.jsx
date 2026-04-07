import { createContext, useContext, useState, useEffect } from "react";
import { crm } from "@/api/crmClient";

const WorkspaceContext = createContext(null);

const DEFAULT_WORKSPACE = {
  id: "workspace_default",
  name: "EMAT Celulosa",
  owner_user_id: "demo@emat.com"
};

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  useEffect(() => {
    bootstrapWorkspace();
  }, []);

  const bootstrapWorkspace = () => {
    // Use default workspace for now (local data storage)
    setWorkspace(DEFAULT_WORKSPACE);
    setWorkspaceLoading(false);
  };

  return (
    <WorkspaceContext.Provider value={{ workspace: workspace || DEFAULT_WORKSPACE, workspaceLoading, refetchWorkspace: bootstrapWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    return { workspace: DEFAULT_WORKSPACE, workspaceLoading: false, refetchWorkspace: () => {} };
  }
  return context;
}
