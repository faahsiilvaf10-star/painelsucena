import { useState, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, ShieldCheck, Trash2, UserPlus, Users, Image, Upload, UserCog, Megaphone, Pencil, LayoutList } from "lucide-react";
import { BulkEmployeeEditor } from "@/components/admin/BulkEmployeeEditor";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { NavVisibilityManager } from "@/components/admin/NavVisibilityManager";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  role_id: string | null;
}


const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { settings, updateSettings, uploadLogo, isLoading: settingsLoading } = useSiteSettings();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<AppRole>("user");
  
  // Edit/Delete user dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<UserWithRole | null>(null);
  
  // Site settings state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all users with their profiles and roles
  const { data: usersData, isLoading: usersLoading } = useQuery({
    // NOTE: keep this key unique. Other hooks may also fetch admin-related data
    // with different shapes (e.g. a Set of IDs), which would break this page.
    queryKey: ["admin-users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role");

      if (rolesError) throw rolesError;

      const usersMap = new Map<string, UserWithRole>();

      profiles?.forEach((profile) => {
        usersMap.set(profile.user_id, {
          user_id: profile.user_id,
          email: "",
          full_name: profile.full_name,
          role: null,
          role_id: null,
        });
      });

      roles?.forEach((role) => {
        const existing = usersMap.get(role.user_id);
        if (existing) {
          existing.role = role.role;
          existing.role_id = role.id;
        } else {
          usersMap.set(role.user_id, {
            user_id: role.user_id,
            email: "",
            full_name: null,
            role: role.role,
            role_id: role.id,
          });
        }
      });

      return Array.from(usersMap.values());
    },
    enabled: isAdmin,
  });

  // Safety: protect against cache pollution / unexpected shapes
  const users: UserWithRole[] = Array.isArray(usersData) ? usersData : [];

  // Role mutations
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      toast.success("Role adicionada com sucesso!");
      setSelectedUser(undefined);
      setSelectedRole("user");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar role: ${error.message}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      toast.success("Role atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar role: ${error.message}`);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      toast.success("Role removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover role: ${error.message}`);
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const logoUrl = await uploadLogo(file);
      await updateSettings.mutateAsync({ logo_url: logoUrl });
      toast.success("Logo atualizada com sucesso!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload da logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Loading state
  if (authLoading || adminLoading || settingsLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const usersWithoutRole = users.filter((u) => !u.role);

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Administração</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema e permissões dos usuários.
          </p>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-1">
              <UserCog className="w-4 h-4" />
              Funcionários
            </TabsTrigger>
            <TabsTrigger value="visibility" className="flex items-center gap-1">
              <LayoutList className="w-4 h-4" />
              Visibilidade
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1">
              <Megaphone className="w-4 h-4" />
              Comunicados
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Logo Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Logo do Site
                </CardTitle>
                <CardDescription>
                  Altere a logo exibida na barra lateral do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                    {settings.logo_url ? (
                      <img 
                        src={settings.logo_url} 
                        alt="Logo atual" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      variant="outline"
                    >
                      {isUploadingLogo ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar Nova Logo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.role === "admin").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sem Role</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usersWithoutRole.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Add Role Section */}
            {usersWithoutRole.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Atribuir Role
                  </CardTitle>
                  <CardDescription>
                    Selecione um usuário e atribua uma role de acesso.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersWithoutRole.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name || "Usuário sem nome"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Selecione uma role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        if (selectedUser) {
                          addRoleMutation.mutate({ userId: selectedUser, role: selectedRole });
                        }
                      }}
                      disabled={!selectedUser || addRoleMutation.isPending}
                    >
                      {addRoleMutation.isPending ? "Adicionando..." : "Adicionar Role"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Usuários e Permissões</CardTitle>
                <CardDescription>
                  Lista de todos os usuários registrados e suas respectivas roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            {u.full_name || "Usuário sem nome"}
                            {u.user_id === user?.id && (
                              <Badge variant="outline" className="ml-2">
                                Você
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.role ? (
                              <Select
                                value={u.role}
                                onValueChange={(newRole) => {
                                  if (u.role_id) {
                                    updateRoleMutation.mutate({
                                      roleId: u.role_id,
                                      newRole: newRole as AppRole,
                                    });
                                  }
                                }}
                                disabled={u.user_id === user?.id}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4" />
                                      Usuário
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <ShieldCheck className="w-4 h-4" />
                                      Administrador
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary">Sem role</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {u.user_id !== user?.id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUserForAction(u);
                                      setEditDialogOpen(true);
                                    }}
                                    title="Editar usuário"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setSelectedUserForAction(u);
                                      setDeleteDialogOpen(true);
                                    }}
                                    title="Excluir usuário"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Employees Tab */}
          <TabsContent value="employees">
            <BulkEmployeeEditor />
          </TabsContent>

          {/* Visibility Tab */}
          <TabsContent value="visibility">
            <NavVisibilityManager />
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <AnnouncementManager />
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUserForAction}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />

        {/* Delete User Dialog */}
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          user={selectedUserForAction}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      </div>
    </Layout>
  );
};

export default Admin;
