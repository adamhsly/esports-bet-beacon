 import { useState } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { CreditCard, Bitcoin, Loader2 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 export type PaymentMethod = 'stripe' | 'crypto';
 
 interface PaymentMethodModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSelect: (method: PaymentMethod) => void;
   loading?: boolean;
   entryFee?: number;
   roundName?: string;
 }
 
 export function PaymentMethodModal({
   open,
   onOpenChange,
   onSelect,
   loading = false,
   entryFee,
   roundName,
 }: PaymentMethodModalProps) {
   const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
 
   const handleConfirm = () => {
     if (selectedMethod) {
       onSelect(selectedMethod);
     }
   };
 
   const formatPrice = (pence: number) => {
     return `£${(pence / 100).toFixed(2)}`;
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md bg-card border-border">
         <DialogHeader>
           <DialogTitle className="text-foreground text-xl">
             Choose Payment Method
           </DialogTitle>
           <DialogDescription className="text-muted-foreground">
             {roundName && entryFee ? (
               <>Entry fee: <span className="text-primary font-semibold">{formatPrice(entryFee)}</span> for {roundName}</>
             ) : (
               'Select how you would like to pay for your entry'
             )}
           </DialogDescription>
         </DialogHeader>
 
         <div className="grid gap-3 py-4">
           {/* Stripe Option */}
           <button
             onClick={() => setSelectedMethod('stripe')}
             disabled={loading}
             className={cn(
               'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
               'hover:border-primary/50 hover:bg-primary/5',
               selectedMethod === 'stripe'
                 ? 'border-primary bg-primary/10'
                 : 'border-border bg-background/50'
             )}
           >
             <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
             <CreditCard className="w-6 h-6 text-primary" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold text-foreground">Card Payment</h3>
               <p className="text-sm text-muted-foreground">
                 Pay with credit or debit card via Stripe
               </p>
             </div>
             <div className={cn(
               'w-5 h-5 rounded-full border-2 flex items-center justify-center',
               selectedMethod === 'stripe' ? 'border-primary' : 'border-muted-foreground/30'
             )}>
               {selectedMethod === 'stripe' && (
                 <div className="w-2.5 h-2.5 rounded-full bg-primary" />
               )}
             </div>
           </button>
 
           {/* Crypto Option */}
           <button
             onClick={() => setSelectedMethod('crypto')}
             disabled={loading}
             className={cn(
               'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
               'hover:border-primary/50 hover:bg-primary/5',
               selectedMethod === 'crypto'
                 ? 'border-primary bg-primary/10'
                 : 'border-border bg-background/50'
             )}
           >
             <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
             <Bitcoin className="w-6 h-6 text-accent" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold text-foreground">Crypto Payment</h3>
               <p className="text-sm text-muted-foreground">
                 Pay with BTC, ETH, USDC & more via Coinbase
               </p>
             </div>
             <div className={cn(
               'w-5 h-5 rounded-full border-2 flex items-center justify-center',
               selectedMethod === 'crypto' ? 'border-primary' : 'border-muted-foreground/30'
             )}>
               {selectedMethod === 'crypto' && (
                 <div className="w-2.5 h-2.5 rounded-full bg-primary" />
               )}
             </div>
           </button>
         </div>
 
         <div className="flex gap-3">
           <Button
             variant="outline"
             onClick={() => onOpenChange(false)}
             className="flex-1"
             disabled={loading}
           >
             Cancel
           </Button>
           <Button
             onClick={handleConfirm}
             disabled={!selectedMethod || loading}
             className="flex-1"
           >
             {loading ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Processing...
               </>
             ) : (
               'Continue'
             )}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }