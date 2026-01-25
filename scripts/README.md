# Seed Data Script

This script populates your Appwrite database with sample users and posts for testing and MVP demonstrations.

## What it creates:

- **5 Sample Users** with avatars and bios
- **8 Sample Posts** with captions, locations, tags, and images from Unsplash
- **Random Likes** on posts to simulate engagement

## Setup

1. Make sure your `.env.local` file has all required Appwrite credentials:

   ```
   VITE_APPWRITE_URL=
   VITE_APPWRITE_PROJECT_ID=
   VITE_APPWRITE_DATABASE_ID=
   VITE_APPWRITE_STORAGE_ID=
   VITE_APPWRITE_USER_COLLECTION_ID=
   VITE_APPWRITE_POST_COLLECTION_ID=
   VITE_APPWRITE_SAVES_COLLECTION_ID=
   ```

2. Install dependencies (in the scripts directory):

   ```bash
   npm install --prefix . -f package-seed.json
   ```

   Or install globally:

   ```bash
   npm install -g tsx
   ```

3. Run the seed script:

   ```bash
   npm run seed
   ```

   Or with tsx directly:

   ```bash
   npx tsx scripts/seed.ts
   ```

## Notes

- The script uses external Unsplash images to avoid storage limitations
- Users have generated avatar images using DiceBear API
- Posts are distributed evenly among users
- Each post gets 1-3 random likes for realistic engagement
- You can run this script multiple times, but it will create duplicate data

## Customization

Edit `scripts/seed.ts` to:

- Add more users or posts
- Change captions, locations, or tags
- Modify the number of likes
- Use different image sources

## Clean Up

To remove seed data, you'll need to manually delete the documents from your Appwrite console or create a cleanup script.
