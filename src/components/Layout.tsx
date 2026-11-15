import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <OfflineBanner />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Layout;
