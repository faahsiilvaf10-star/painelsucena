import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Truck, Calendar, Clock, Search, Plus } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EntradaSaidaEquipamentos = () => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                Entrada e Saída de Equipamentos
              </h1>
              <p className="text-muted-foreground mt-2">
                Registre a entrada e saída de equipamentos do canteiro
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Registro
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por equipamento ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="todos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="entradas" className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Entradas
            </TabsTrigger>
            <TabsTrigger value="saidas" className="gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              Saídas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registros de Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum registro encontrado</p>
                  <p className="text-sm mt-1">Clique em "Novo Registro" para adicionar</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entradas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-green-500" />
                  Entradas de Equipamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowDownToLine className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p>Nenhuma entrada registrada hoje</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saidas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                  Saídas de Equipamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpFromLine className="h-12 w-12 mx-auto mb-4 opacity-50 text-orange-500" />
                  <p>Nenhuma saída registrada hoje</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/20">
                  <ArrowDownToLine className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entradas Hoje</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/20">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saídas Hoje</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No Canteiro</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default EntradaSaidaEquipamentos;
