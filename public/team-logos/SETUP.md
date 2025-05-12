
# Setup Instructions for Team Logos

## Step 1: Download Logos
Download the team logos from the [LootMarket esport-team-logos repository](https://github.com/lootmarket/esport-team-logos).

```bash
git clone https://github.com/lootmarket/esport-team-logos.git
```

## Step 2: Copy Logos
Copy all the `.png` files from the repository to this directory (`public/team-logos/`).

Expected files include:
- astralis.png
- cloud9.png
- complexity.png
- eg.png
- faze.png
- fnatic.png
- g2.png
- liquid.png
- navi.png
- nip.png
- og.png
- virtuspro.png
- etc.

## Step 3: Verify
Ensure all the logos are properly loaded by visiting different match pages.

## Step 4: Update Mapping
If you need to add more teams to the mapping, update the `teamLogoMap` in `src/utils/teamLogoUtils.ts`.
