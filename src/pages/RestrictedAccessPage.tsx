import Footer from "@/components/Footer";
import { ShieldX, Globe } from "lucide-react";

const RestrictedAccessPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-16 max-w-2xl flex flex-col items-center justify-center text-center">
        <div className="bg-black border border-border rounded-xl p-8 md:p-12 shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Globe className="w-20 h-20 text-white/70" />
              <ShieldX className="w-10 h-10 text-red-500 absolute -bottom-1 -right-1 bg-black rounded-full p-1" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Region Not Supported
          </h1>
          
          <p className="text-white/80 text-lg mb-6">
            Unfortunately, Frags and Fortunes is not available in your region due to local regulations regarding fantasy contests.
          </p>
          
          <div className="bg-white/10 rounded-lg p-4 mb-8">
            <p className="text-sm text-white/70">
              Fantasy esports contests may be restricted or prohibited in certain jurisdictions. 
              We comply with all applicable laws and regulations to ensure responsible gaming practices.
            </p>
          </div>
          
          <p className="text-sm text-white/70">
            If you believe this is an error or have questions, please contact us at{" "}
            <a 
              href="mailto:theteam@fragsandfortunes.com" 
              className="text-primary hover:underline"
            >
              theteam@fragsandfortunes.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RestrictedAccessPage;
