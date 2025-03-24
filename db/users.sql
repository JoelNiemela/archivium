SELECT 
    user.id, user.username, user.email, user.updated_at,
    (user.created_at = user.updated_at) AS once,
    user.verified AS veri,
    user.suspect AS sus,
    universes.count AS unis,
    items.count AS items,
    comments.count AS comments
FROM user
LEFT JOIN (
    SELECT DISTINCT au.user_id, COUNT(au.universe_id) AS count, JSON_ARRAYAGG(universe.title) AS titles
    FROM authoruniverse AS au
    INNER JOIN universe ON au.universe_id = universe.id
    GROUP BY user_id
) AS universes ON universes.user_id = user.id
LEFT JOIN (
    SELECT DISTINCT author_id, COUNT(id) AS count FROM item GROUP BY author_id
) AS items ON items.author_id = user.id
LEFT JOIN (
    SELECT DISTINCT author_id, COUNT(id) AS count FROM comment GROUP BY author_id
) AS comments ON comments.author_id = user.id
GROUP BY user.id
ORDER BY once, veri DESC, user.created_at;