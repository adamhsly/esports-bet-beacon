import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useSlate, useSlateMatches } from '@/hooks/usePickems';
import { extractTeams } from '@/lib/pickems';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';

const PickemsSlateEditorPage: React.FC = () => {
  const { slateId } = useParams<{ slateId: string }>();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: slate } = useSlate(slateId);
  const { data: slateMatches, refetch: refetchSlateMatches } = useSlateMatches(slateId);
  const qc = useQueryClient();

  const [searchEsport, setSearchEsport] = useState('');
  const [searchTournament, setSearchTournament] = useState('');
  const [searchStatus, setSearchStatus] = useState('not_started');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  if (!roleLoading && !isAdmin) {
    return <div className="p-6 text-white">Admin access required.</div>;
  }

  const search = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchEsport) params.set('esport_type', searchEsport);
      if (searchTournament) params.set('tournament_name', searchTournament);
      if (searchStatus) params.set('status', searchStatus);
      if (searchFrom) params.set('from', new Date(searchFrom).toISOString());
      if (searchTo) params.set('to', new Date(searchTo).toISOString());
      const { data, error } = await supabase.functions.invoke(`pickems-search-matches?${params.toString()}`, { method: 'GET' });
      if (error) throw error;
      setResults((data as any)?.matches ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addMatch = async (matchId: string) => {
    if (!slateId) return;
    const { error } = await (supabase as any)
      .from('pickems_slate_matches')
      .insert({ slate_id: slateId, match_id: matchId, display_order: (slateMatches?.length ?? 0) });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Match added');
    refetchSlateMatches();
  };

  const removeMatch = async (matchId: string) => {
    if (!slateId) return;
    const { error } = await (supabase as any)
      .from('pickems_slate_matches')
      .delete()
      .eq('slate_id', slateId)
      .eq('match_id', matchId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Match removed');
    refetchSlateMatches();
  };

  const updateStatus = async (status: string) => {
    if (!slateId) return;
    const { error } = await (supabase as any)
      .from('pickems_slates')
      .update({ status })
      .eq('id', slateId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status: ${status}`);
    qc.invalidateQueries({ queryKey: ['pickems'] });

    // When publishing, kick off random test-user picks (1-1000) so the
    // leaderboard isn't empty. Fire-and-forget; don't block the UI.
    if (status === 'published') {
      supabase.functions
        .invoke('pickems-seed-test-picks', {
          body: { slate_id: slateId, min: 1, max: 1000 },
        })
        .then(({ data, error: seedErr }) => {
          if (seedErr) {
            toast.error(`Seeding test picks failed: ${seedErr.message}`);
          } else {
            const n = (data as any)?.inserted_entries ?? 0;
            if (n > 0) toast.success(`Seeded ${n} test-user picks`);
          }
        });
    }
  };

  const settleNow = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pickems-settle-slate', { body: { slate_id: slateId } });
      if (error) throw error;
      toast.success(`Settled ${(data as any)?.total_settled ?? 0} picks`);
      qc.invalidateQueries({ queryKey: ['pickems'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Settlement failed');
    }
  };

  const addedIds = new Set((slateMatches ?? []).map(m => m.match_id));

  const setTiebreaker = async (matchId: string | null) => {
    if (!slateId) return;
    const { error } = await (supabase as any)
      .from('pickems_slates')
      .update({ tiebreaker_match_id: matchId })
      .eq('id', slateId);
    if (error) { toast.error(error.message); return; }
    toast.success(matchId ? 'Tiebreaker set' : 'Tiebreaker cleared');
    qc.invalidateQueries({ queryKey: ['pickems', 'slate', slateId] });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet><title>Edit Slate | Pick'ems Admin</title></Helmet>
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Link to="/admin/pickems" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to admin
        </Link>

        {slate && (
          <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{slate.name}</h1>
              <p className="text-sm text-gray-400">{slate.tournament_name} · {slate.esport_type}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{slate.status}</Badge>
              <Select value={slate.status} onValueChange={updateStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="published">published</SelectItem>
                  <SelectItem value="closed">closed</SelectItem>
                  <SelectItem value="settled">settled</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={settleNow}>Settle now</Button>
            </div>
          </header>
        )}

        <Card className="bg-slate-800/40 border-slate-700 mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Matches in slate ({slateMatches?.length ?? 0})</h2>
            {(slateMatches ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm">No matches added yet.</p>
            ) : (
              <div className="space-y-2">
                {slateMatches!.map(m => {
                  const isTb = slate?.tiebreaker_match_id === m.match_id;
                  return (
                    <div key={m.match_id} className={`flex items-center justify-between gap-2 p-2 rounded ${isTb ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-900/40'}`}>
                      <div className="text-sm truncate">
                        <span className="text-white">{m.team_a?.name ?? 'TBD'}</span>
                        <span className="text-gray-500 mx-2">vs</span>
                        <span className="text-white">{m.team_b?.name ?? 'TBD'}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {m.start_time && format(new Date(m.start_time), 'MMM d HH:mm')} · {m.tournament_name}
                        </span>
                        {isTb && <span className="ml-2 text-xs text-amber-400 font-semibold">★ Tiebreaker</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={isTb ? 'default' : 'ghost'}
                          className={isTb ? 'bg-amber-500 hover:bg-amber-600 text-black h-7' : 'h-7'}
                          onClick={() => setTiebreaker(isTb ? null : m.match_id)}
                          title={isTb ? 'Clear tiebreaker' : 'Set as tiebreaker'}
                        >
                          ★
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeMatch(m.match_id)}>
                          <Trash2 className="h-4 w-4 text-rose-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/40 border-slate-700">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Search className="h-4 w-4" /> Search PandaScore matches</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Esport</Label>
                <Select value={searchEsport} onValueChange={setSearchEsport}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csgo">CS2</SelectItem>
                    <SelectItem value="dota2">Dota 2</SelectItem>
                    <SelectItem value="lol">LoL</SelectItem>
                    <SelectItem value="valorant">Valorant</SelectItem>
                    <SelectItem value="r6siege">R6 Siege</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tournament name contains</Label>
                <Input value={searchTournament} onChange={e => setSearchTournament(e.target.value)} placeholder="ESL Pro League" />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={searchStatus} onValueChange={setSearchStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">not_started</SelectItem>
                    <SelectItem value="running">running</SelectItem>
                    <SelectItem value="finished">finished</SelectItem>
                    <SelectItem value="all">all</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">From</Label>
                <Input type="datetime-local" value={searchFrom} onChange={e => setSearchFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="datetime-local" value={searchTo} onChange={e => setSearchTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={search} disabled={searching} className="w-full">
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            <div className="space-y-1 max-h-[480px] overflow-y-auto pt-2">
              {results.map(r => {
                const { a, b } = extractTeams(r.teams);
                const added = addedIds.has(r.match_id);
                return (
                  <div key={r.match_id} className="flex items-center justify-between gap-2 p-2 bg-slate-900/40 rounded text-sm">
                    <div className="min-w-0">
                      <div className="truncate">
                        <span className="text-white">{a?.name ?? 'TBD'}</span>
                        <span className="text-gray-500 mx-2">vs</span>
                        <span className="text-white">{b?.name ?? 'TBD'}</span>
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {r.start_time && format(new Date(r.start_time), 'MMM d HH:mm')} · {r.tournament_name} · {r.esport_type}
                      </div>
                    </div>
                    <Button size="sm" variant={added ? 'ghost' : 'outline'} disabled={added} onClick={() => addMatch(r.match_id)}>
                      {added ? 'Added' : <><Plus className="h-3.5 w-3.5 mr-1" /> Add</>}
                    </Button>
                  </div>
                );
              })}
              {results.length === 0 && <p className="text-gray-500 text-sm">No results yet — run a search.</p>}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PickemsSlateEditorPage;
