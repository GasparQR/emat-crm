import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const WorkspaceContext = createContext(null);

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
        setWorkspaceLoading(false);
        return;
      }

      // Buscar si el usuario ya tiene un workspace
      const members = await base44.entities.WorkspaceMember.filter({ user_id: user.email });

      if (members.length > 0) {
        // Tomar el primer workspace (admin preferido)
        const adminMembership = members.find(m => m.role === "admin") || members[0];
        const workspaces = await base44.entities.Workspace.filter({ id: adminMembership.workspace_id });
        if (workspaces.length > 0) {
          setWorkspace(workspaces[0]);
        }
      } else {
        // Crear workspace nuevo para este usuario
        const newWorkspace = await base44.entities.Workspace.create({
          name: user.full_name ? `Workspace de ${user.full_name}` : "Mi Workspace",
          owner_user_id: user.email
        });
        await base44.entities.WorkspaceMember.create({
          workspace_id: newWorkspace.id,
          user_id: user.email,
          role: "admin"
        });
        setWorkspace(newWorkspace);
      }
    } catch (err) {
      console.error("Error bootstrapping workspace:", err);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaceLoading, refetchWorkspace: bootstrapWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}