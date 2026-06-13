const express = require('express');
const { readJSON } = require('../utils/storage');

const router = express.Router();

router.get('/', (req, res) => {
  const { sortBy = 'weeklyMinutes', scope = 'all', userId, instrument, city } = req.query;

  const checkins = readJSON('checkins.json', []);
  const users = readJSON('users.json', []);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const userStatsMap = {};

  users.forEach(u => {
    userStatsMap[u.id] = {
      userId: u.id,
      username: u.username,
      avatar: u.avatar,
      city: u.city || '',
      instruments: u.instruments || [],
      skillLevel: u.skillLevel || '',
      weeklyMinutes: 0,
      streak: 0,
      pieceCount: 0,
      pieces: new Set()
    };
  });

  checkins.forEach(c => {
    const stat = userStatsMap[c.userId];
    if (!stat) return;

    const cDate = new Date(c.createdAt);
    if (cDate >= weekStart) {
      stat.weeklyMinutes += c.duration || 0;
    }

    if (c.piece) {
      stat.pieces.add(c.piece);
    }
  });

  Object.values(userStatsMap).forEach(stat => {
    stat.pieceCount = stat.pieces.size;
    delete stat.pieces;

    const userCheckins = checkins.filter(c => c.userId === stat.userId);
    stat.streak = calculateStreak(userCheckins);
  });

  let candidates = Object.values(userStatsMap);

  if (scope === 'city' && city) {
    candidates = candidates.filter(u => u.city === city);
  }

  if (scope === 'instrument' && instrument) {
    candidates = candidates.filter(u =>
      u.instruments.some(i => i === instrument)
    );
  }

  const validSortFields = ['weeklyMinutes', 'streak', 'pieceCount'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'weeklyMinutes';

  candidates.sort((a, b) => {
    if (b[sortField] !== a[sortField]) return b[sortField] - a[sortField];
    return a.userId.localeCompare(b.userId);
  });

  const ranked = candidates.map((u, idx) => ({
    ...u,
    rank: idx + 1
  }));

  let myRank = null;
  if (userId) {
    const me = ranked.find(u => u.userId === userId);
    if (me) {
      myRank = me.rank;
    } else {
      const allRanked = Object.values(userStatsMap).sort((a, b) => {
        if (b[sortField] !== a[sortField]) return b[sortField] - a[sortField];
        return a.userId.localeCompare(b.userId);
      });
      const idx = allRanked.findIndex(u => u.userId === userId);
      if (idx >= 0) myRank = idx + 1;
    }
  }

  const top50 = ranked.slice(0, 50);

  res.json({
    sortBy,
    scope,
    list: top50,
    myRank,
    myStats: userId ? userStatsMap[userId] || null : null
  });
});

function calculateStreak(checkins) {
  if (checkins.length === 0) return 0;

  const dates = new Set(
    checkins.map(c => new Date(c.createdAt).toDateString())
  );

  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    if (dates.has(checkDate.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

module.exports = router;
