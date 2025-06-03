
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, CreditCard } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { CardCollection } from '@/components/cards/CardCollection';
import { PackStore } from '@/components/cards/PackStore';

const CardsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-3xl font-bold font-gaming">
              <span className="highlight-gradient">NFT</span> Cards
            </h1>
          </div>

          <Tabs defaultValue="collection" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-theme-gray-dark">
              <TabsTrigger 
                value="collection" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <CreditCard className="mr-2" size={16} />
                My Collection
              </TabsTrigger>
              <TabsTrigger 
                value="packs" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <Package className="mr-2" size={16} />
                Pack Store
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collection" className="space-y-6">
              <CardCollection />
            </TabsContent>

            <TabsContent value="packs" className="space-y-6">
              <PackStore />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CardsPage;
