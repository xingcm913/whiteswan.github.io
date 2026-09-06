import type { Post } from '../types'

export const SEED_POSTS: Post[] = [
  {
    id: 'p1',
    author: '小樱',
    avatar: '🌸',
    language: 'ja',
    title: '分享我的日语 N5 备考心得',
    content: '大家好！我用了三个月从零开始通过了 N5，主要方法是每天坚持背 20 个单词 + 看动漫磨耳朵。有问题欢迎交流～',
    createdAt: '2026-09-01T08:30:00',
    likes: ['u2', 'u3'],
    comments: [
      { id: 'c1', author: '太郎', avatar: '🐱', content: '请问你用的什么单词书？', createdAt: '2026-09-01T09:00:00' },
    ],
  },
  {
    id: 'p2',
    author: '韩语小白',
    avatar: '🐰',
    language: 'ko',
    title: '韩语收音太难了！求技巧',
    content: '收音总是发不准，尤其是 ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅇ，有没有大佬指点一下发音技巧？',
    createdAt: '2026-09-02T14:20:00',
    likes: ['u1'],
    comments: [],
  },
  {
    id: 'p3',
    author: 'English Fan',
    avatar: '🦊',
    language: 'en',
    title: 'How I improved my speaking in 3 months',
    content: 'Shadowing technique really works! I practiced 30 minutes every day following English podcasts. Now I can speak more fluently.',
    createdAt: '2026-09-03T10:15:00',
    likes: ['u2', 'u3', 'u1'],
    comments: [
      { id: 'c2', author: '小明', avatar: '🐼', content: '请问推荐哪些播客？', createdAt: '2026-09-03T11:00:00' },
    ],
  },
]
