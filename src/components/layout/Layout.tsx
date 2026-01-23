import { ReactNode } from "react";
import Header from "./Header";
import ForbiddenColorIndicator from "@/components/ForbiddenColorIndicator";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">{children}</main>
      <ForbiddenColorIndicator />
    </div>
  );
};

export default Layout;
