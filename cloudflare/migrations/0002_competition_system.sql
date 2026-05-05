PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS daily_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checkin_date TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 75,
  source TEXT NOT NULL DEFAULT 'daily_button',
  created_at TEXT NOT NULL,
  UNIQUE (user_id, checkin_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, checkin_date);

INSERT OR IGNORE INTO badges (title, description, icon) VALUES
  ('First Workout', 'Complete your first workout check-in or saved workout.', 'Medal'),
  ('7-Day Streak', 'Check in for seven training days in a row.', 'Flame'),
  ('30-Day Streak', 'Check in for thirty training days in a row.', 'CalendarCheck'),
  ('Chest Warrior', 'Complete three chest sessions.', 'Shield'),
  ('Leg Day Survivor', 'Complete two leg sessions.', 'Dumbbell'),
  ('Cardio Machine', 'Complete three cardio sessions.', 'Activity'),
  ('1000 Points', 'Reach 1000 total points.', 'Trophy'),
  ('5000 Points', 'Reach 5000 total points.', 'Crown');

INSERT OR IGNORE INTO challenges (title, description, points, metric, target, muscle_group) VALUES
  ('Most workouts this week', 'Whoever logs the most workouts this week leads the weekly fight.', 150, 'weekly_workouts', 1, NULL),
  ('Most points this week', 'The weekly points king owns bragging rights.', 150, 'weekly_points', 1, NULL),
  ('Most chest sessions', 'Chest volume decides this mini-rivalry.', 150, 'weekly_chest', 1, 'Chest'),
  ('Most cardio sessions', 'Cardio sessions count toward this weekly race.', 150, 'weekly_cardio', 1, 'Cardio'),
  ('No skipped day challenge', 'Check in every day this week so far.', 150, 'weekly_no_skip', 1, NULL);

INSERT OR IGNORE INTO exercises (
  name, muscle_group, difficulty, equipment, instructions, common_mistakes,
  recommended_sets, recommended_reps, animation_type, animation_asset_key,
  animation_media_type, animation_src, animation_credit, calories_estimate
) VALUES
  ('Deadlift', 'Legs', 'Advanced', 'Barbell',
   '["Stand with the bar over midfoot.","Hinge down and grip the bar just outside your legs.","Brace hard and push the floor away.","Lock out with hips through, then lower under control."]',
   '["Rounding the lower back","Yanking the bar off the floor","Letting the bar drift forward"]',
   4, '3-6', 'hinge', 'deadlift', 'video', '/exercise-media/legs/deadlift.mp4', NULL, 110),
  ('Running Time', 'Cardio', 'Beginner', 'Track, treadmill, or road',
   '["Warm up for five minutes.","Run the selected distance at a controlled hard pace.","Keep shoulders relaxed and cadence steady.","Record your best time in minutes."]',
   '["Starting too fast","Skipping warm-up","Holding the treadmill rails"]',
   1, 'Best time', 'run', 'running-time', 'video', '/exercise-media/cardio/running-time.mp4', NULL, 220);

UPDATE exercises
SET animation_media_type = 'video',
    animation_src = '/exercise-media/' || lower(replace(muscle_group, ' ', '-')) || '/' || animation_asset_key || '.mp4'
WHERE (animation_media_type IS NULL OR animation_media_type = '')
  AND animation_asset_key IS NOT NULL
  AND animation_asset_key != '';
