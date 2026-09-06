import type { Language } from '../types'

export const LANGUAGES: Language[] = [
  {
    code: 'en',
    name: '英语',
    nativeName: 'English',
    flag: '🇬🇧',
    speechLang: 'en-US',
    levels: ['A1 入门', 'A2 初级', 'B1 中级', 'B2 中高级', 'C1 高级'],
  },
  {
    code: 'ja',
    name: '日语',
    nativeName: '日本語',
    flag: '🇯🇵',
    speechLang: 'ja-JP',
    levels: ['N5 入门', 'N4 初级', 'N3 中级', 'N2 中高级', 'N1 高级'],
  },
  {
    code: 'ko',
    name: '韩语',
    nativeName: '한국어',
    flag: '🇰🇷',
    speechLang: 'ko-KR',
    levels: ['TOPIK I 初级', 'TOPIK II 中级', 'TOPIK III 高级'],
  },
]
