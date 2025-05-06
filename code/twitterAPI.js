const { TwitterApi } = require("twitter-api-v2");
const fs = require("fs");
const { DateTime } = require("luxon");
const path = require("path");
const notifier = require("node-notifier");

// Authentication configuration
const BEARER_TOKEN = "[YOUR_BEARER]"
// Flag to stop execution
let stopRequested = false;

// Capture SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  console.log("\nInterruption requested. Saving progress...");
  stopRequested = true;
});

// Function to authenticate with the Twitter API
const authenticateTwitterApi = () => {
  try {
    const client = new TwitterApi(BEARER_TOKEN);
    console.log("Authentication successful.");
    return client.readOnly;
  } catch (error) {
    console.error("API authentication error:", error);
    throw error;
  }
};

// Function to validate parameters
const validateParameters = (query, startDate, endDate) => {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("The query is invalid or empty.");
  }
  if (!startDate || !DateTime.fromISO(startDate).isValid) {
    throw new Error("The start date is invalid.");
  }
  if (!endDate || !DateTime.fromISO(endDate).isValid) {
    throw new Error("The end date is invalid.");
  }
  if (DateTime.fromISO(startDate) > DateTime.fromISO(endDate)) {
    throw new Error(
      "The start date cannot be later than the end date."
    );
  }
};

// Function to wait for a specified time
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to incrementally write tweets to a CSV file
const writeTweetsToCsvIncrementally = (tweets, filePath) => {
  const header = [
    "Geo",
    "Created At",
    "Likes",
    "Retweets",
    "Tweet ID",
    "Username",
    "Text",
    "User Location",
    "Followers Count",
  ];

  const exists = fs.existsSync(filePath);
  const fileStream = fs.createWriteStream(filePath, { flags: "a" });

  if (!exists) {
    fileStream.write(header.join(",") + "\n"); // Write header only once
  }

  tweets.forEach((tweet) => {
    const csvLine = tweet.map((field) => `"${field}"`).join(",");
    fileStream.write(csvLine + "\n");
  });

  fileStream.end();
  console.log(`Progress saved to: ${filePath}`);
};

// Function to fetch tweets with safe stop support
const getTweetDataWithStopSupport = async (
  client,
  query,
  startDate,
  endDate,
  filePath
) => {
  const tweets = [];
  let nextToken = null;

  validateParameters(query, startDate, endDate);

  do {
    if (stopRequested) {
      console.log("Interruption detected. Stopping tweet collection.");
      break; // Exit loop if interruption was requested
    }

    const params = {
      "tweet.fields": ["created_at", "public_metrics", "geo", "author_id"],
      "user.fields": ["username", "public_metrics", "created_at", "location"],
      expansions: "author_id",
      start_time: startDate,
      end_time: endDate,
      max_results: 500,
    };

    if (nextToken) {
      params.next_token = nextToken;
    }

    try {
      const response = await client.v2.searchAll(query, params);
      const users = (response.includes?.users || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      const batch = (response._realData.data || []).map((tweet) => {
        const user = users[tweet.author_id] || {};
        return [
          tweet.geo ? JSON.stringify(tweet.geo) : "N/A",
          tweet.created_at,
          tweet.public_metrics?.like_count || 0,
          tweet.public_metrics?.retweet_count || 0,
          tweet.id,
          user.username || "N/A",
          tweet.text.replace(/\n/g, " "),
          user.location || "N/A",
          user.public_metrics?.followers_count || 0,
        ];
      });

      tweets.push(...batch);
      writeTweetsToCsvIncrementally(batch, filePath); // Save partial progress

      nextToken = response.meta?.next_token || null;
      if (nextToken) await wait(5000);
    } catch (error) {
      if (error.data?.title === "Rate limit exceeded") {
        const resetTime =
          parseInt(error.headers["x-rate-limit-reset"], 10) * 1000;
        const delay = resetTime - Date.now();
        console.log(`Rate limit reached. Waiting ${delay / 1000}s.`);
        await wait(delay);
      } else {
        throw error;
      }
    }
  } while (nextToken);

  console.log(`${tweets.length} tweets collected for query: ${query}`);
  return tweets;
};

// Main function
const main = async () => {
  const client = authenticateTwitterApi();
  const queries = ["Police Use of Force -is:retweet"];
  const startDate = "2018-12-01T00:00:00Z";
  const endDate = "2018-12-31T23:59:59Z";

  for (const query of queries) {
    console.log(`Collecting tweets for: ${query}`);
    try {
      const cleanedQuery = query.replace("-is:retweet", "").trim();
      const filePath = path.resolve(
        "[YOUR_PATH]",
        `${cleanedQuery}.csv`
        `${cleanedQuery}.temp.csv`
      );
      await getTweetDataWithStopSupport(
        client,
        query,
        startDate,
        endDate,
        filePath
      );
    } catch (error) {
      console.error(`Error processing '${query}':`, error);
    }
  }

  console.log("Execution finished.");

  /* notifier.notify({
    title: "Program Completed",
    message: "The script execution has finished!",
    sound: true, // Plays a default system sound
  }); */
};

main().catch((error) => console.error("Execution error:", error));