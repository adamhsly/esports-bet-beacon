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
       <DialogContent className="sm:max-w-md bg-[#0d0d1a] border-primary/30 rounded-xl">
         <DialogHeader>
           <DialogTitle className="text-white text-xl font-bold text-center">
             Choose Payment Method
           </DialogTitle>
           <DialogDescription className="text-gray-400 text-center">
             {roundName && entryFee ? (
                <>Entry fee: <span className="text-green-400 font-bold">{formatPrice(entryFee)}</span> for {roundName}</>
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
               'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
               'hover:border-primary/60 hover:bg-primary/10',
               selectedMethod === 'stripe'
                 ? 'border-primary bg-primary/15 shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                 : 'border-white/10 bg-white/5'
             )}
           >
             <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
               <CreditCard className="w-6 h-6 text-primary" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold text-white">Card Payment</h3>
               <p className="text-sm text-gray-400">
                 Pay with credit or debit card via Stripe
               </p>
             </div>
             <div className={cn(
               'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
               selectedMethod === 'stripe' ? 'border-primary bg-primary/20' : 'border-white/30'
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
               'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
               'hover:border-accent/60 hover:bg-accent/10',
               selectedMethod === 'crypto'
                 ? 'border-accent bg-accent/15 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                 : 'border-white/10 bg-white/5'
             )}
           >
             <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center border border-accent/30">
               <Bitcoin className="w-6 h-6 text-accent" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold text-white">Crypto Payment</h3>
               <p className="text-sm text-gray-400">
                 Pay with BTC, ETH, USDC & more via Coinbase
               </p>
             </div>
             <div className={cn(
               'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
               selectedMethod === 'crypto' ? 'border-accent bg-accent/20' : 'border-white/30'
             )}>
               {selectedMethod === 'crypto' && (
                 <div className="w-2.5 h-2.5 rounded-full bg-accent" />
               )}
             </div>
           </button>
         </div>
 
         <div className="flex gap-3">
           <Button
             variant="outline"
             onClick={() => onOpenChange(false)}
              className="flex-1 bg-slate-700/80 hover:bg-slate-600/80 text-white border-none font-medium"
             disabled={loading}
           >
             Cancel
           </Button>
           <Button
             onClick={handleConfirm}
             disabled={!selectedMethod || loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all"
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