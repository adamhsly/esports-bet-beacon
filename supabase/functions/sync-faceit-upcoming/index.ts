for (const tournament of tournaments) {
  const tournamentId = tournament.tournament_id;
  if (!tournamentId) {
    console.warn("⚠️ Tournament missing ID, skipping:", tournament);
    continue;
  }

  const matchesResp = await fetch(
    `https://open.faceit.com/data/v4/tournaments/${tournamentId}/matches`,
    { headers: { Authorization: `Bearer ${faceitApiKey}` } }
  );

  if (!matchesResp.ok) {
    console.warn(`⚠️ Failed to fetch matches for tournament ${tournamentId}`);
    continue;
  }

  const { items: matches } = await matchesResp.json();
  console.log(`🎯 Found ${matches.length} matches for tournament ${tournamentId}`);

  ...
}
