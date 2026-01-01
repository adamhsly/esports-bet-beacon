-- First delete fantasy_round_picks for the amateur round
DELETE FROM public.fantasy_round_picks WHERE round_id = 'bc5f3139-3acc-4275-b1e1-a78b576aead6';

-- Delete fantasy_team_prices for the amateur round
DELETE FROM public.fantasy_team_prices WHERE round_id = 'bc5f3139-3acc-4275-b1e1-a78b576aead6';

-- Delete round_entries for the amateur round
DELETE FROM public.round_entries WHERE round_id = 'bc5f3139-3acc-4275-b1e1-a78b576aead6';

-- Delete fantasy_round_star_teams for the amateur round  
DELETE FROM public.fantasy_round_star_teams WHERE round_id = 'bc5f3139-3acc-4275-b1e1-a78b576aead6';

-- Delete fantasy_round_team_swaps for the amateur round
DELETE FROM public.fantasy_round_team_swaps WHERE round_id = 'bc5f3139-3acc-4275-b1e1-a78b576aead6';

-- Delete fantasy_round_scores for the amateur round
DELETE FROM public.fantasy_round_scores WHERE round_id = 'bc5f3139-3acc-4275-b1e1-a78b576aead6';

-- Now delete the amateur paid weekly round for Jan 5
DELETE FROM public.fantasy_rounds WHERE id = 'bc5f3139-3acc-4275-b1e1-a78b576aead6';

-- Also clean up test users from the PRO paid weekly round (keep the round, delete test entries)
DELETE FROM public.fantasy_round_picks WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';
DELETE FROM public.round_entries WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';
DELETE FROM public.fantasy_round_star_teams WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';
DELETE FROM public.fantasy_round_team_swaps WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';
DELETE FROM public.fantasy_round_scores WHERE round_id = 'f100d98a-8944-4da3-9133-9ca3b86f35ca';