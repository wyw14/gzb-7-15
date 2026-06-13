<template>
  <div class="leaderboard-page">
    <div class="page-header">
      <div class="container">
        <h1>🏆 练习排行榜</h1>
        <p>看看谁是本周最努力的练琴达人</p>
      </div>
    </div>

    <div class="container">
      <div class="controls card">
        <div class="control-row">
          <div class="control-group">
            <span class="control-label">排名维度</span>
            <el-radio-group v-model="sortBy" size="default" @change="fetchData">
              <el-radio-button value="weeklyMinutes">本周时长</el-radio-button>
              <el-radio-button value="streak">连续打卡</el-radio-button>
              <el-radio-button value="pieceCount">练习曲目</el-radio-button>
            </el-radio-group>
          </div>
          <div class="control-group">
            <span class="control-label">查看范围</span>
            <el-radio-group v-model="scope" size="default" @change="fetchData">
              <el-radio-button value="all">全站榜</el-radio-button>
              <el-radio-button value="city">同城榜</el-radio-button>
              <el-radio-button value="instrument">同乐器榜</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </div>

      <div class="podium-section" v-if="topN.length">
        <div class="podium" :class="'podium-' + topN.length">
          <template v-for="item in podiumOrder" :key="item.key">
            <div
              v-if="topN[item.idx]"
              class="podium-item"
              :class="item.cls"
              @click="goUser(topN[item.idx].userId)"
            >
              <div class="crown" v-if="item.cls === 'first'">👑</div>
              <div class="podium-avatar-wrap">
                <img :src="topN[item.idx].avatar" class="podium-avatar" />
                <span class="podium-medal" :class="item.medal">{{ topN[item.idx].rank }}</span>
              </div>
              <div class="podium-name">{{ topN[item.idx].username }}</div>
              <div class="podium-value">{{ formatValue(topN[item.idx]) }}</div>
              <div class="podium-bar" :class="item.barCls"></div>
            </div>
          </template>
        </div>
      </div>

      <div class="rank-list card" v-if="restList.length">
        <div
          class="rank-row"
          v-for="item in restList"
          :key="item.userId"
          :class="{ 'is-me': item.userId === userStore.userId }"
          @click="goUser(item.userId)"
        >
          <span class="rank-num">{{ item.rank }}</span>
          <img :src="item.avatar" class="avatar-sm" />
          <span class="rank-username">{{ item.username }}</span>
          <span class="rank-city" v-if="item.city">{{ item.city }}</span>
          <span class="rank-instruments">
            <span class="inst-tag" v-for="inst in item.instruments.slice(0, 2)" :key="inst">{{ inst }}</span>
          </span>
          <span class="rank-value">{{ formatValue(item) }}</span>
        </div>
      </div>

      <div class="my-rank-bar card" v-if="userStore.isLoggedIn && myRank">
        <div class="my-rank-inner">
          <span class="my-rank-label">我的排名</span>
          <span class="my-rank-num">第 {{ myRank }} 名</span>
          <span class="my-rank-value">{{ formatValue(myStats) }}</span>
          <router-link to="/checkin" class="my-rank-action">
            <el-button type="primary" size="small">去练琴</el-button>
          </router-link>
        </div>
      </div>

      <div class="empty-state" v-if="!loading && list.length === 0">
        <el-icon><Trophy /></el-icon>
        <p>暂无排行数据，去打卡成为第一个上榜的人吧！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { leaderboardApi } from '../api'
import { Trophy } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const sortBy = ref('weeklyMinutes')
const scope = ref('all')
const list = ref([])
const myRank = ref(null)
const myStats = ref(null)
const loading = ref(false)

const PODIUM_COUNT = 3

const topN = computed(() => list.value.slice(0, PODIUM_COUNT))
const restList = computed(() => list.value.slice(topN.value.length))

const podiumLayouts = {
  1: [
    { key: 0, idx: 0, cls: 'first', medal: 'gold', barCls: 'gold-bar' }
  ],
  2: [
    { key: 1, idx: 1, cls: 'second', medal: 'silver', barCls: 'silver-bar' },
    { key: 0, idx: 0, cls: 'first', medal: 'gold', barCls: 'gold-bar' }
  ],
  3: [
    { key: 1, idx: 1, cls: 'second', medal: 'silver', barCls: 'silver-bar' },
    { key: 0, idx: 0, cls: 'first', medal: 'gold', barCls: 'gold-bar' },
    { key: 2, idx: 2, cls: 'third', medal: 'bronze', barCls: 'bronze-bar' }
  ]
}

const podiumOrder = computed(() => {
  const n = topN.value.length
  const layout = podiumLayouts[n] || []
  return layout.map(l => ({ ...l }))
})

const formatValue = (item) => {
  if (!item) return ''
  if (sortBy.value === 'weeklyMinutes') {
    const h = Math.round(item.weeklyMinutes / 60 * 10) / 10
    return `${h} 小时`
  }
  if (sortBy.value === 'streak') {
    return `${item.streak} 天`
  }
  return `${item.pieceCount} 首`
}

const goUser = (userId) => {
  router.push(`/buddies/${userId}`)
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      sortBy: sortBy.value,
      scope: scope.value
    }
    if (userStore.isLoggedIn) {
      params.userId = userStore.userId
    }
    if (scope.value === 'city' && userStore.currentUser?.city) {
      params.city = userStore.currentUser.city
    }
    if (scope.value === 'instrument' && userStore.currentUser?.instruments?.length) {
      params.instrument = userStore.currentUser.instruments[0]
    }
    const result = await leaderboardApi.get(params)
    list.value = result.list || []
    myRank.value = result.myRank || null
    myStats.value = result.myStats || null
  } catch (e) {
    console.error('获取排行榜失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.controls {
  margin-bottom: 24px;
}

.control-row {
  display: flex;
  gap: 32px;
  align-items: center;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.podium-section {
  margin-bottom: 24px;
}

.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 16px;
  padding: 20px 0 0;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.podium-item:hover {
  transform: translateY(-4px);
}

.podium-item.first {
  order: 2;
}

.podium-item.second {
  order: 1;
}

.podium-item.third {
  order: 3;
}

.crown {
  font-size: 32px;
  margin-bottom: 4px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.podium-avatar-wrap {
  position: relative;
  margin-bottom: 8px;
}

.podium-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
}

.podium-item.first .podium-avatar {
  width: 80px;
  height: 80px;
  border-color: #fbbf24;
}

.podium-item.second .podium-avatar {
  border-color: #9ca3af;
}

.podium-item.third .podium-avatar {
  border-color: #d97706;
}

.podium-medal {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
}

.podium-medal.gold {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.podium-medal.silver {
  background: linear-gradient(135deg, #9ca3af, #6b7280);
}

.podium-medal.bronze {
  background: linear-gradient(135deg, #d97706, #b45309);
}

.podium-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.podium-value {
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 500;
  margin-bottom: 8px;
}

.podium-bar {
  width: 100px;
  border-radius: 8px 8px 0 0;
}

.gold-bar {
  height: 80px;
  background: linear-gradient(180deg, #fef3c7, #fbbf24);
}

.silver-bar {
  height: 56px;
  background: linear-gradient(180deg, #f3f4f6, #9ca3af);
}

.bronze-bar {
  height: 40px;
  background: linear-gradient(180deg, #fef3c7, #d97706);
}

.rank-list {
  padding: 0;
  overflow: hidden;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s;
}

.rank-row:last-child {
  border-bottom: none;
}

.rank-row:hover {
  background: var(--bg-light);
}

.rank-row.is-me {
  background: #eef2ff;
}

.rank-num {
  width: 32px;
  text-align: center;
  font-weight: 700;
  font-size: 15px;
  color: var(--text-secondary);
}

.rank-username {
  font-weight: 500;
  font-size: 14px;
  min-width: 80px;
}

.rank-city {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-light);
  padding: 2px 8px;
  border-radius: 4px;
}

.rank-instruments {
  display: flex;
  gap: 4px;
  flex: 1;
}

.inst-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: #eef2ff;
  color: var(--primary-dark);
  border-radius: 4px;
}

.rank-value {
  font-weight: 600;
  font-size: 14px;
  color: var(--primary-color);
  white-space: nowrap;
}

.my-rank-bar {
  margin-top: 24px;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  border: 1px solid #c7d2fe;
}

.my-rank-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.my-rank-label {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.my-rank-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}

.my-rank-value {
  font-size: 14px;
  color: var(--text-secondary);
  flex: 1;
}

.my-rank-action {
  margin-left: auto;
}

@media (max-width: 768px) {
  .control-row {
    flex-direction: column;
    gap: 16px;
  }

  .podium-avatar {
    width: 48px;
    height: 48px;
  }

  .podium-item.first .podium-avatar {
    width: 60px;
    height: 60px;
  }

  .gold-bar {
    height: 60px;
    width: 72px;
  }

  .silver-bar {
    height: 40px;
    width: 60px;
  }

  .bronze-bar {
    height: 28px;
    width: 60px;
  }

  .rank-city {
    display: none;
  }

  .my-rank-inner {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
