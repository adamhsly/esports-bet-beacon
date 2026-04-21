import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAllSlatesAdmin } from '@/hooks/usePickems';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, RefreshCw } from 'lucide-react';

const PickemsAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: slates, isLoading } = useAllSlatesAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [esport, setEsport] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!user) {
    return <div className="p-6 text-white">Please sign in.</div>;
  }
  if (!roleLoading && !isAdmin) {
    return <div className="p-6 text-white">Admin access required.</div>;
  }

  const create = async () => {
    if (!name || !startDate || !endDate) {
      toast.error('Name, start and end date are required');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await (supabase as any)
        .from('pickems_slates')
        .insert({
          name,
          description: description || null,
          tournament_name: tournamentName || null,
          esport_type: esport || null,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Slate created');
      qc.invalidateQueries({ queryKey: ['pickems', 'slates', 'admin'] });
      navigate(`/admin/pickems/${data.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create slate');
    } finally {
      setCreating(false);
    }
  };

  const settleAll = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pickems-settle-slate', { body: {} });
      if (error) throw error;
      toast.success(`Settled ${(data as any)?.total_settled ?? 0} picks`);
      qc.invalidateQueries({ queryKey: ['pickems'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to settle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet><title>Pick'ems Admin | Frags & Fortunes</title></Helmet>
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pick'ems Admin</h1>
          <Button variant="outline" size="sm" onClick={settleAll}>
            <RefreshCw className="h-4 w-4 mr-1" /> Settle all
          </Button>
        </div>

        <Card className="bg-slate-800/40 border-slate-700 mb-6">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Create new slate</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="ESL Pro League Week 3" />
              </div>
              <div>
                <Label className="text-xs">Tournament name</Label>
                <Input value={tournamentName} onChange={e => setTournamentName(e.target.value)} placeholder="ESL Pro League S23" />
              </div>
              <div>
                <Label className="text-xs">Esport</Label>
                <Select value={esport} onValueChange={setEsport}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csgo">CS2</SelectItem>
                    <SelectItem value="dota2">Dota 2</SelectItem>
                    <SelectItem value="lol">LoL</SelectItem>
                    <SelectItem value="valorant">Valorant</SelectItem>
                    <SelectItem value="r6siege">R6 Siege</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Start date *</Label>
                <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End date *</Label>
                <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={create} disabled={creating} className="bg-theme-purple hover:bg-theme-purple/90">
              {creating ? 'Creating...' : 'Create slate'}
            </Button>
          </CardContent>
        </Card>

        <h2 className="font-semibold mb-3">All slates</h2>
        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (slates ?? []).length === 0 ? (
          <p className="text-gray-400">No slates yet.</p>
        ) : (
          <div className="grid gap-2">
            {slates!.map(s => (
              <Card key={s.id} className="bg-slate-800/40 border-slate-700">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {s.tournament_name} · {s.esport_type} · {new Date(s.start_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{s.status}</Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/pickems/${s.id}`}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PickemsAdminPage;
