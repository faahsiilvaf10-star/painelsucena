 import { Truck } from "lucide-react";
 import Layout from "@/components/layout/Layout";
 
 const EntradaSaidaEquipamentos = () => {
   return (
     <Layout>
       <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
         <div className="mb-6 sm:mb-8 animate-fade-in">
           <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
             <div className="p-2 rounded-lg bg-primary/10">
               <Truck className="h-6 w-6 text-primary" />
             </div>
             Entrada e Saída de Equipamentos
           </h1>
           <p className="text-muted-foreground mt-2">
             Página em construção
           </p>
         </div>
       </div>
     </Layout>
   );
 };
 
 export default EntradaSaidaEquipamentos;