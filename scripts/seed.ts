import { Client, Databases, Storage, ID, Permission, Role } from "appwrite";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

// Appwrite configuration
const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_URL || "")
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID || "");

const databases = new Databases(client);
const storage = new Storage(client);

const appwriteConfig = {
  databaseId: process.env.VITE_APPWRITE_DATABASE_ID || "",
  storageId: process.env.VITE_APPWRITE_STORAGE_ID || "",
  userCollectionId: process.env.VITE_APPWRITE_USER_COLLECTION_ID || "",
  postCollectionId: process.env.VITE_APPWRITE_POST_COLLECTION_ID || "",
  savesCollectionId: process.env.VITE_APPWRITE_SAVES_COLLECTION_ID || "",
};

// Sample users data
const sampleUsers = [
  {
    accountId: ID.unique(),
    name: "Alex Johnson",
    username: "alexj",
    email: "alex@example.com",
    bio: "Travel enthusiast | Photography lover 📸",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  },
  {
    accountId: ID.unique(),
    name: "Maria Garcia",
    username: "mariag",
    email: "maria@example.com",
    bio: "Food blogger & chef 🍳 | Sharing my culinary adventures",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
  },
  {
    accountId: ID.unique(),
    name: "James Wilson",
    username: "jamesw",
    email: "james@example.com",
    bio: "Tech enthusiast | Building cool stuff 💻",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
  },
  {
    accountId: ID.unique(),
    name: "Sarah Chen",
    username: "sarahc",
    email: "sarah@example.com",
    bio: "Fitness coach | Helping people achieve their goals 💪",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    accountId: ID.unique(),
    name: "David Brown",
    username: "davidb",
    email: "david@example.com",
    bio: "Nature photographer | Capturing moments 🌿",
    imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
];

// Sample posts data (without images for now - you can add placeholder image URLs)
const samplePosts = [
  {
    caption: "Beautiful sunset at the beach today! 🌅 #sunset #beach #nature",
    location: "Santa Monica, CA",
    tags: ["sunset", "beach", "nature", "photography"],
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
  },
  {
    caption: "Made this delicious pasta from scratch! Recipe coming soon 🍝",
    location: "New York, NY",
    tags: ["food", "cooking", "pasta", "homemade"],
    imageUrl:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=600&fit=crop",
  },
  {
    caption: "New office setup complete! Productivity level 📈",
    location: "San Francisco, CA",
    tags: ["tech", "workspace", "productivity"],
    imageUrl:
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop",
  },
  {
    caption: "Morning workout done! Who else is training today? 💪",
    location: "Los Angeles, CA",
    tags: ["fitness", "workout", "health", "motivation"],
    imageUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop",
  },
  {
    caption: "Captured this amazing wildlife moment in the forest 🦌",
    location: "Yosemite National Park",
    tags: ["wildlife", "nature", "photography", "forest"],
    imageUrl:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
  },
  {
    caption: "Coffee and code - perfect combination ☕️💻",
    location: "Seattle, WA",
    tags: ["coding", "coffee", "developer", "tech"],
    imageUrl:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
  },
  {
    caption: "Homemade pizza night! 🍕 Margherita is always a winner",
    location: "Chicago, IL",
    tags: ["food", "pizza", "cooking", "homemade"],
    imageUrl:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop",
  },
  {
    caption:
      "Mountain hiking adventures! The view from the top is always worth it 🏔️",
    location: "Rocky Mountains, CO",
    tags: ["hiking", "mountains", "adventure", "nature"],
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
  },
];

async function createUsers() {
  console.log("Creating users...");
  const createdUsers = [];

  for (const user of sampleUsers) {
    try {
      const newUser = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        ID.unique(),
        user,
        [Permission.read(Role.any())],
      );
      createdUsers.push(newUser);
      console.log(`✓ Created user: ${user.name}`);
    } catch (error: any) {
      console.error(`✗ Failed to create user ${user.name}:`, error.message);
    }
  }

  return createdUsers;
}

async function createPosts(users: any[]) {
  console.log("\nCreating posts...");
  const createdPosts = [];

  for (let i = 0; i < samplePosts.length; i++) {
    const post = samplePosts[i];
    const creator = users[i % users.length]; // Distribute posts among users

    try {
      const newPost = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        ID.unique(),
        {
          creator: creator.$id,
          caption: post.caption,
          imageUrl: post.imageUrl,
          imageId: "", // Empty for external URLs
          location: post.location,
          tags: post.tags,
          likes: [], // Empty array for likes
        },
        [Permission.read(Role.any())],
      );
      createdPosts.push(newPost);
      console.log(
        `✓ Created post by ${creator.name}: ${post.caption.substring(0, 50)}...`,
      );
    } catch (error: any) {
      console.error(`✗ Failed to create post:`, error.message);
    }
  }

  return createdPosts;
}

async function addLikesToPosts(posts: any[], users: any[]) {
  console.log("\nAdding likes to posts...");

  for (const post of posts) {
    try {
      // Randomly select 1-3 users to like this post
      const numLikes = Math.floor(Math.random() * 3) + 1;
      const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
      const likers = shuffledUsers.slice(0, numLikes);
      const likesArray = likers.map((user) => user.$id);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        post.$id,
        {
          likes: likesArray,
        },
      );
      console.log(`✓ Added ${numLikes} likes to post ${post.$id}`);
    } catch (error: any) {
      console.error(
        `✗ Failed to add likes to post ${post.$id}:`,
        error.message,
      );
    }
  }
}

async function seed() {
  console.log("🌱 Starting seed process...\n");
  console.log("=".repeat(50));

  try {
    // Create users
    const users = await createUsers();
    console.log(`\n✓ Total users created: ${users.length}`);

    if (users.length === 0) {
      console.log("No users created. Aborting seed process.");
      return;
    }

    // Create posts
    const posts = await createPosts(users);
    console.log(`\n✓ Total posts created: ${posts.length}`);

    // Add likes to posts
    if (posts.length > 0) {
      await addLikesToPosts(posts, users);
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 Seed completed successfully!");
    console.log(`   Users: ${users.length}`);
    console.log(`   Posts: ${posts.length}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
  }
}

// Run the seed function
seed();
