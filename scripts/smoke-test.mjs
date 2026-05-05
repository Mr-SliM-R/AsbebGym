const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:4000";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${payload?.message ?? "no JSON body"}`);
  }

  return payload;
}

const health = await request("/api/health");
if (!health.ok) throw new Error("Health check did not return ok.");

const users = await request("/api/users");
if (!Array.isArray(users) || users.length === 0) throw new Error("No users returned.");

const userId = Number(users[0].id);
const dashboard = await request(`/api/dashboard/${userId}`);
if (!dashboard.progressCharts || !dashboard.activityFeed) throw new Error("Dashboard is missing progress or activity data.");

const workoutContext = await request(`/api/workout-context/${userId}`);
if (!Array.isArray(workoutContext.templates) || !Array.isArray(workoutContext.lastPerformances)) {
  throw new Error("Workout context response is invalid.");
}

console.log(`Smoke test passed against ${baseUrl}`);
