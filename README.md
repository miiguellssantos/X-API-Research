# Twitter Data Collector

A Node.js script that uses the Twitter API v2 to search and collect tweets in bulk, save progress incrementally to CSV, and handle rate limits and safe interruption (Ctrl+C).

## Features

- **Authentication** with Twitter v2 Bearer Token  
- **Incremental CSV export** with headers  
- **Safe interruption** (SIGINT) and progress saving  
- **Rate-limit handling** with automatic wait until reset  
- **Configurable query**, date range, and output folder  

## Prerequisites

- Node.js v14+  
- A Twitter Developer account with Elevated or Academic Research access  
- A valid Bearer Token  

## Installation

1. Clone this repository  
   ```bash
   git clone https://github.com/miiguellssantos/X-API-Research.git
   cd X-API-Research
   ```

2. Install dependencies  
   ```bash
   npm install twitter-api-v2 luxon node-notifier
   ```

3. Add your Bearer Token  
   - Open `twitterAPI.js`  
   - Replace the placeholder in the `BEARER_TOKEN` constant with your actual token  

## Configuration

- **Queries**  
  Edit the `queries` array in `twitterAPI.js` to define one or more search queries.  
- **Date range**  
  Adjust `startDate` and `endDate` (ISO 8601 format) in `main()` to control the period.  
- **Output path**  
  Change the `path.resolve(...)` in `main()` to point to your desired CSV directory.

## Usage

```bash
node twitterAPI.js
```

- The script logs authentication status, each batch progress, and any rate-limit waits.  
- Press **Ctrl+C** to safely stop the run; progress will be saved up to the last batch.

## CSV Output Format

| Geo    | Created At            | Likes | Retweets | Tweet ID          | Username | Text           | User Location | Followers Count |
|--------|-----------------------|-------|----------|-------------------|----------|----------------|---------------|-----------------|
| JSON   | `YYYY-MM-DDTHH:MM:SSZ`| int   | int      | string            | string   | string         | string        | int             |

## Extending

- Add more tweet or user fields by modifying `params` in `getTweetDataWithStopSupport()`.  
- Re-enable desktop notifications (using `node-notifier`) by uncommenting the `notifier.notify(...)` block.
