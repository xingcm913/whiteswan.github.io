export type LangCode = 'en' | 'ja' | 'ko'

export interface Language {
  code: LangCode
  name: string
  nativeName: string
  flag: string
  speechLang: string
  levels: string[]
}

export type Level = string

export interface VocabItem {
  id: string
  word: string
  translation: string
  pronunciation: string
  example: string
  exampleTrans: string
  partOfSpeech: string
}

export interface GrammarQuestion {
  id: string
  prompt: string
  type: 'fill' | 'choice'
  options?: string[]
  answer: string
  explanation: string
}

export interface SpeakingItem {
  id: string
  text: string
  translation: string
}

export interface ListeningItem {
  id: string
  text: string
  translation: string
  question: string
  options: string[]
  answer: number
}

export interface Lesson {
  id: string
  title: string
  description: string
  xp: number
  vocab: VocabItem[]
  grammar: GrammarQuestion[]
  speaking: SpeakingItem[]
  listening: ListeningItem[]
}

export interface Course {
  id: string
  language: LangCode
  level: Level
  title: string
  description: string
  color: string
  lessons: Lesson[]
}

export interface User {
  id: string
  username: string
  password: string
  avatar: string
  createdAt: string
  languages: LangCode[]
  currentLanguage: LangCode
  level: number
  xp: number
  streak: number
  lastActiveDate: string
  completedLessons: string[]
  vocabMastered: string[]
  achievements: string[]
  preferences: {
    dailyGoal: number
    interests: string[]
  }
}

export interface Post {
  id: string
  author: string
  avatar: string
  language: LangCode
  title: string
  content: string
  createdAt: string
  likes: string[]
  comments: Comment[]
}

export interface Comment {
  id: string
  author: string
  avatar: string
  content: string
  createdAt: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xp: number
  condition: (stats: UserStats) => boolean
}

export interface UserStats {
  xp: number
  streak: number
  completedLessons: number
  vocabMastered: number
  daysActive: number
}

export interface ActivityLog {
  date: string
  xp: number
  lessons: number
}
