import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ActivityLog, Post, User, UserStats } from '../types'
import { ACHIEVEMENTS } from '../data/achievements'
import { SEED_POSTS } from '../data/posts'
import { load, save, todayStr, daysBetween } from '../lib/storage'

interface AppContextValue {
  users: User[]
  currentUser: User | null
  posts: Post[]
  activity: ActivityLog[]
  register: (username: string, password: string) => { ok: boolean; msg: string }
  login: (username: string, password: string) => { ok: boolean; msg: string }
  logout: () => void
  updateUser: (patch: Partial<User>) => void
  addXP: (amount: number, lessonId?: string) => void
  completeLesson: (lessonId: string, xp: number) => void
  masterVocab: (vocabId: string) => void
  setLanguage: (code: User['currentLanguage']) => void
  addPost: (post: Omit<Post, 'id' | 'author' | 'avatar' | 'createdAt' | 'likes' | 'comments'>) => void
  toggleLike: (postId: string) => void
  addComment: (postId: string, content: string) => void
  checkAchievements: () => string[]
  getUserStats: (u: User) => UserStats
  leaderboard: User[]
}

const AppContext = createContext<AppContextValue | null>(null)

const AVATARS = ['🦊', '🐼', '🐱', '🐰', '🌸', '🦉', '🐯', '🦁', '🐨', '🦄']

function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => load<User[]>('lingo_users', []))
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    load<string | null>('lingo_current', null),
  )
  const [posts, setPosts] = useState<Post[]>(() => {
    const stored = load<Post[] | null>('lingo_posts', null)
    if (stored && stored.length) return stored
    return SEED_POSTS
  })
  const [activity, setActivity] = useState<ActivityLog[]>(() =>
    load<ActivityLog[]>('lingo_activity', []),
  )

  useEffect(() => save('lingo_users', users), [users])
  useEffect(() => save('lingo_current', currentUserId), [currentUserId])
  useEffect(() => save('lingo_posts', posts), [posts])
  useEffect(() => save('lingo_activity', activity), [activity])

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId],
  )

  // update streak on load if user exists
  useEffect(() => {
    if (!currentUser) return
    const today = todayStr()
    if (currentUser.lastActiveDate === today) return
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== currentUser.id) return u
        const diff = daysBetween(u.lastActiveDate, today)
        let streak = u.streak
        if (diff === 1) streak += 1
        else if (diff > 1) streak = 1
        return { ...u, streak, lastActiveDate: today }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  function updateUser(patch: Partial<User>) {
    if (!currentUser) return
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, ...patch } : u)),
    )
  }

  function recordActivity(xp: number, lessons = 0) {
    const today = todayStr()
    setActivity((prev) => {
      const idx = prev.findIndex((a) => a.date === today)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], xp: next[idx].xp + xp, lessons: next[idx].lessons + lessons }
        return next
      }
      return [...prev, { date: today, xp, lessons }]
    })
  }

  function addXP(amount: number) {
    if (!currentUser) return
    recordActivity(amount)
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== currentUser.id) return u
        const xp = u.xp + amount
        const level = Math.floor(xp / 500) + 1
        return { ...u, xp, level }
      }),
    )
  }

  function completeLesson(lessonId: string, xp: number) {
    if (!currentUser) return
    const already = currentUser.completedLessons.includes(lessonId)
    recordActivity(xp, 1)
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== currentUser.id) return u
        const completed = already ? u.completedLessons : [...u.completedLessons, lessonId]
        const gainedXP = already ? Math.floor(xp / 3) : xp
        const newXp = u.xp + gainedXP
        const level = Math.floor(newXp / 500) + 1
        const today = todayStr()
        const diff = daysBetween(u.lastActiveDate, today)
        let streak = u.streak
        if (diff === 1) streak += 1
        else if (diff > 1) streak = 1
        else if (diff === 0) streak = Math.max(1, streak)
        return { ...u, completedLessons: completed, xp: newXp, level, streak, lastActiveDate: today }
      }),
    )
  }

  function masterVocab(vocabId: string) {
    if (!currentUser) return
    if (currentUser.vocabMastered.includes(vocabId)) return
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, vocabMastered: [...u.vocabMastered, vocabId] }
          : u,
      ),
    )
  }

  function setLanguage(code: User['currentLanguage']) {
    if (!currentUser) return
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== currentUser.id) return u
        const languages = u.languages.includes(code) ? u.languages : [...u.languages, code]
        return { ...u, currentLanguage: code, languages }
      }),
    )
  }

  function register(username: string, password: string) {
    if (username.length < 2) return { ok: false, msg: '用户名至少 2 个字符' }
    if (password.length < 4) return { ok: false, msg: '密码至少 4 个字符' }
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, msg: '用户名已存在' }
    }
    const newUser: User = {
      id: uid(),
      username,
      password,
      avatar: randomAvatar(),
      createdAt: new Date().toISOString(),
      languages: ['en'],
      currentLanguage: 'en',
      level: 1,
      xp: 0,
      streak: 1,
      lastActiveDate: todayStr(),
      completedLessons: [],
      vocabMastered: [],
      achievements: [],
      preferences: { dailyGoal: 30, interests: ['日常会话'] },
    }
    setUsers((prev) => [...prev, newUser])
    setCurrentUserId(newUser.id)
    recordActivity(0)
    return { ok: true, msg: '注册成功' }
  }

  function login(username: string, password: string) {
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password,
    )
    if (!user) return { ok: false, msg: '用户名或密码错误' }
    setCurrentUserId(user.id)
    const today = todayStr()
    if (user.lastActiveDate !== today) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== user.id) return u
          const diff = daysBetween(u.lastActiveDate, today)
          let streak = u.streak
          if (diff === 1) streak += 1
          else if (diff > 1) streak = 1
          return { ...u, streak, lastActiveDate: today }
        }),
      )
    }
    return { ok: true, msg: '登录成功' }
  }

  function logout() {
    setCurrentUserId(null)
  }

  function addPost(data: Omit<Post, 'id' | 'author' | 'avatar' | 'createdAt' | 'likes' | 'comments'>) {
    if (!currentUser) return
    const post: Post = {
      ...data,
      id: uid(),
      author: currentUser.username,
      avatar: currentUser.avatar,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
    }
    setPosts((prev) => [post, ...prev])
  }

  function toggleLike(postId: string) {
    if (!currentUser) return
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p
        const liked = p.likes.includes(currentUser.id)
        return {
          ...p,
          likes: liked
            ? p.likes.filter((id) => id !== currentUser.id)
            : [...p.likes, currentUser.id],
        }
      }),
    )
  }

  function addComment(postId: string, content: string) {
    if (!currentUser || !content.trim()) return
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: uid(),
                  author: currentUser.username,
                  avatar: currentUser.avatar,
                  content,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : p,
      ),
    )
  }

  function getUserStats(u: User): UserStats {
    return {
      xp: u.xp,
      streak: u.streak,
      completedLessons: u.completedLessons.length,
      vocabMastered: u.vocabMastered.length,
      daysActive: activity.length,
    }
  }

  function checkAchievements(): string[] {
    if (!currentUser) return []
    const stats = getUserStats(currentUser)
    const newly: string[] = []
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== currentUser.id) return u
        const unlocked = [...u.achievements]
        let bonusXP = 0
        for (const a of ACHIEVEMENTS) {
          if (!unlocked.includes(a.id) && a.condition(stats)) {
            unlocked.push(a.id)
            bonusXP += a.xp
            newly.push(a.id)
          }
        }
        const xp = u.xp + bonusXP
        const level = Math.floor(xp / 500) + 1
        return { ...u, achievements: unlocked, xp, level }
      }),
    )
    return newly
  }

  const leaderboard = useMemo(() => {
    return [...users].sort((a, b) => b.xp - a.xp).slice(0, 10)
  }, [users])

  const value: AppContextValue = {
    users,
    currentUser,
    posts,
    activity,
    register,
    login,
    logout,
    updateUser,
    addXP,
    completeLesson,
    masterVocab,
    setLanguage,
    addPost,
    toggleLike,
    addComment,
    checkAchievements,
    getUserStats,
    leaderboard,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
