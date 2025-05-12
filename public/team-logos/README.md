
# Team Logos

This application uses team logos sourced directly from the [LootMarket esport-team-logos repository](https://github.com/lootmarket/esport-team-logos).

## Implementation Details

- Logos are loaded directly from the GitHub repository raw content URLs
- The base URL used is: `https://raw.githubusercontent.com/lootmarket/esport-team-logos/master/`
- Each logo is referenced by its filename: `{team-name}.png`
- Example: `https://raw.githubusercontent.com/lootmarket/esport-team-logos/master/navi.png`

## Team Name Mapping

A mapping between team names and logo filenames is maintained in `src/utils/teamLogoUtils.ts`

## Attribution

All logos are from the LootMarket GitHub repository:
https://github.com/lootmarket/esport-team-logos

## Fallback

If a team logo cannot be found, the application will display a placeholder image.
