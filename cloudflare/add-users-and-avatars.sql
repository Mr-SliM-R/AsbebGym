PRAGMA foreign_keys = ON;

INSERT INTO users (id, username, avatar, weight_goal, favorite_muscle_group)
VALUES
  (1, 'Slim', 'S', 'Lean muscle gain', 'Chest'),
  (2, 'Adel', 'A', 'Strength and conditioning', 'Legs'),
  (3, 'Saber', 'S', 'Power and athleticism', 'Back')
ON CONFLICT(id) DO UPDATE SET
  username = excluded.username,
  weight_goal = excluded.weight_goal,
  favorite_muscle_group = excluded.favorite_muscle_group,
  avatar = CASE
    WHEN users.avatar = '' OR users.avatar = 'F' THEN excluded.avatar
    ELSE users.avatar
  END;

INSERT OR IGNORE INTO user_stats (user_id, total_points, weekly_points, workouts_completed, current_streak)
VALUES
  (1, 0, 0, 0, 0),
  (2, 0, 0, 0, 0),
  (3, 0, 0, 0, 0);

INSERT OR IGNORE INTO user_challenges (user_id, challenge_id, progress, completed)
SELECT users.id, challenges.id, 0, 0
FROM users
CROSS JOIN challenges
WHERE users.id IN (1, 2, 3);
