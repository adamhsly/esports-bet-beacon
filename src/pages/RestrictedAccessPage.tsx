import SearchableNavbar from "@/components/SearchableNavbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldX, Globe } from "lucide-react";

const RestrictedAccessPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SearchableNavbar />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-2xl flex flex-col items-center justify-center text-center">
        <div className="bg-card border border-border rounded-xl p-8 md:p-12 shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Globe className="w-20 h-20 text-muted-foreground" />
              <ShieldX className="w-10 h-10 text-destructive absolute -bottom-1 -right-1 bg-card rounded-full p-1" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Region Not Supported
          </h1>
          
          <p className="text-muted-foreground text-lg mb-6">
            Unfortunately, Frags and Fortunes is not available in your region due to local regulations regarding fantasy contests.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-8">
            <p className="text-sm text-muted-foreground">
              Fantasy esports contests may be restricted or prohibited in certain jurisdictions. 
              We comply with all applicable laws and regulations to ensure responsible gaming practices.
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            If you believe this is an error or have questions, please contact us at{" "}
            <a 
              href="mailto:theteam@fragsandfortunes.com" 
              className="text-primary hover:underline"
            >
              theteam@fragsandfortunes.com
            </a>
          </p>
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="mt-2"
          >
            Go Back
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RestrictedAccessPage;
