import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, X, AlertTriangle, CheckCircle, Package, Factory, Hash, ShieldCheck, ShieldAlert, Image, Loader2, Sparkles } from "lucide-react";
import { produtosHomologados, fabricantesUnicos, type ProdutoHomologado } from "@/data/produtosHomologados";
import { useProductImages } from "@/hooks/useProductImages";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Homologados = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [fabricanteFilter, setFabricanteFilter] = useState<string>("todos");
  const [perigosoFilter, setPerigosoFilter] = useState<string>("todos");
  const [controladoFilter, setControladoFilter] = useState<string>("todos");

  const { 
    productImages, 
    isLoading: isLoadingImages, 
    isGenerating, 
    generationProgress,
    getImageByNI,
    generateImages 
  } = useProductImages();

  const filteredProducts = useMemo(() => {
    return produtosHomologados.filter((produto) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        searchTerm === "" ||
        produto.nome.toLowerCase().includes(searchLower) ||
        produto.ni.includes(searchTerm) ||
        produto.fabricante.toLowerCase().includes(searchLower);

      const matchesFabricante = 
        fabricanteFilter === "todos" || 
        produto.fabricante === fabricanteFilter;

      const matchesPerigoso = 
        perigosoFilter === "todos" ||
        (perigosoFilter === "sim" && produto.perigoso) ||
        (perigosoFilter === "nao" && !produto.perigoso);

      const matchesControlado = 
        controladoFilter === "todos" ||
        (controladoFilter === "sim" && produto.controlado) ||
        (controladoFilter === "nao" && !produto.controlado);

      return matchesSearch && matchesFabricante && matchesPerigoso && matchesControlado;
    });
  }, [searchTerm, fabricanteFilter, perigosoFilter, controladoFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setFabricanteFilter("todos");
    setPerigosoFilter("todos");
    setControladoFilter("todos");
  };

  const hasActiveFilters = searchTerm !== "" || fabricanteFilter !== "todos" || perigosoFilter !== "todos" || controladoFilter !== "todos";

  // Statistics
  const stats = useMemo(() => ({
    total: produtosHomologados.length,
    perigosos: produtosHomologados.filter(p => p.perigoso).length,
    controlados: produtosHomologados.filter(p => p.controlado).length,
    fabricantes: fabricantesUnicos.length,
    withImages: productImages.filter(img => img.image_url).length,
  }), [productImages]);

  // Get products without images
  const productsWithoutImages = useMemo(() => {
    const existingNIs = new Set(productImages.map(img => img.product_ni));
    return produtosHomologados.filter(p => !existingNIs.has(p.ni));
  }, [productImages]);

  const handleGenerateAllImages = () => {
    const productsToGenerate = productsWithoutImages.map(p => ({
      ni: p.ni,
      nome: p.nome
    }));
    generateImages(productsToGenerate);
  };

  const getProductInitials = (nome: string) => {
    return nome.substring(0, 2).toUpperCase();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos Homologados</h1>
            <p className="text-muted-foreground">
              Consulte a lista de produtos homologados para uso na operação
            </p>
          </div>
          
          {/* Generate Images Button */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleGenerateAllImages}
              disabled={isGenerating || productsWithoutImages.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando {generationProgress.current}/{generationProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Imagens ({productsWithoutImages.length} faltando)
                </>
              )}
            </Button>
            {isGenerating && (
              <Progress 
                value={(generationProgress.current / generationProgress.total) * 100} 
                className="h-2"
              />
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Produtos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{stats.perigosos}</p>
                <p className="text-xs text-muted-foreground">Perigosos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.controlados}</p>
                <p className="text-xs text-muted-foreground">Controlados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Factory className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.fabricantes}</p>
                <p className="text-xs text-muted-foreground">Fabricantes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Image className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">{stats.withImages}</p>
                <p className="text-xs text-muted-foreground">Com Imagem</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Buscar e Filtrar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do produto, NI ou fabricante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Fabricante</label>
                <Select value={fabricanteFilter} onValueChange={setFabricanteFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos os fabricantes" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border max-h-[300px]">
                    <SelectItem value="todos">Todos os fabricantes</SelectItem>
                    {fabricantesUnicos.map((fab) => (
                      <SelectItem key={fab} value={fab}>
                        {fab}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Perigoso</label>
                <Select value={perigosoFilter} onValueChange={setPerigosoFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border">
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Controlado</label>
                <Select value={controladoFilter} onValueChange={setControladoFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border">
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="w-full gap-2"
                  >
                    <X className="h-4 w-4" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{filteredProducts.length}</span> de{" "}
                <span className="font-semibold text-foreground">{produtosHomologados.length}</span> produtos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold w-[60px]">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Nome do Produto
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        Fabricante
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Hash className="h-4 w-4" />
                        NI
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Perigoso
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Controlado
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Classe de Risco</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Search className="h-12 w-12 opacity-30" />
                          <p className="text-lg font-medium">Nenhum produto encontrado</p>
                          <p className="text-sm">Tente ajustar os filtros ou termo de busca</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((produto) => {
                      const imageUrl = getImageByNI(produto.ni);
                      return (
                        <TableRow key={produto.id} className="hover:bg-muted/30">
                          <TableCell className="w-[60px]">
                            <Avatar className="h-10 w-10 rounded-md">
                              {imageUrl ? (
                                <AvatarImage 
                                  src={imageUrl} 
                                  alt={produto.nome}
                                  className="object-cover"
                                />
                              ) : null}
                              <AvatarFallback className="rounded-md bg-muted text-xs font-medium">
                                {getProductInitials(produto.nome)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium max-w-[300px]">
                            <span className="line-clamp-2">{produto.nome}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px]">
                            <span className="line-clamp-1">{produto.fabricante || "-"}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {produto.ni && produto.ni !== "0" ? (
                              <Badge variant="outline" className="font-mono">
                                {produto.ni}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {produto.perigoso ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Sim
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle className="h-3 w-3" />
                                Não
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {produto.controlado ? (
                              <Badge className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                                <ShieldCheck className="h-3 w-3" />
                                Sim
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <ShieldAlert className="h-3 w-3" />
                                Não
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            {produto.classeRisco ? (
                              <Badge variant="outline" className="text-xs">
                                {produto.classeRisco}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Homologados;
