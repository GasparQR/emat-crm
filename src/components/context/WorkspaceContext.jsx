import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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

  const bootstrapWorkspace = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setWorkspace(DEFAULT_WORKSPACE);
        setWorkspaceLoading(false);
        return;
      }

      // Try to find existing workspace
      try {
        const members = await base44.entities.WorkspaceMember.filter({ user_id: user.email });
        if (members && members.length > 0) {
          const adminMembership = members.find(m => m.role === "admin") || members[0];
          const workspaces = await base44.entities.Workspace.filter({ id: adminMembership.workspace_id });
          if (workspaces && workspaces.length > 0) {
            setWorkspace(workspaces[0]);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch existing workspace:", err);
      }

      // Create or use default workspace
      try {
        const newWorkspace = await base44.entities.Workspace.create({
          name: user.full_name ? `Workspace de ${user.full_name}` : "EMAT Celulosa",
          owner_user_id: user.email
        });
        await base44.entities.WorkspaceMember.create({
          workspace_id: newWorkspace.id,
          user_id: user.email,
          role: "admin"
        });
        setWorkspace(newWorkspace);
      } catch (err) {
        console.warn("Could not create workspace:", err);
        setWorkspace(DEFAULT_WORKSPACE);
      }
    } catch (err) {
      console.error("Error bootstrapping workspace:", err);
      setWorkspace(DEFAULT_WORKSPACE);
    } finally {
      setWorkspaceLoading(false);
    }
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
