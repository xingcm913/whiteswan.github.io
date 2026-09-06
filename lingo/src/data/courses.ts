import type { Course } from '../types'

export const COURSES: Course[] = [
  // ==================== ENGLISH ====================
  {
    id: 'en-a1',
    language: 'en',
    level: 'A1 入门',
    title: '英语入门：日常会话',
    description: '从零开始，掌握最基础的英语问候、数字与日常表达。',
    color: 'from-sky-400 to-blue-500',
    lessons: [
      {
        id: 'en-a1-l1',
        title: 'Greetings 问候',
        description: '学习基本问候语与自我介绍',
        xp: 30,
        vocab: [
          { id: 'v1', word: 'hello', translation: '你好', pronunciation: '/həˈloʊ/', example: 'Hello, nice to meet you.', exampleTrans: '你好，很高兴认识你。', partOfSpeech: 'int.' },
          { id: 'v2', word: 'goodbye', translation: '再见', pronunciation: '/ɡʊdˈbaɪ/', example: 'Goodbye, see you tomorrow!', exampleTrans: '再见，明天见！', partOfSpeech: 'int.' },
          { id: 'v3', word: 'thank you', translation: '谢谢', pronunciation: '/θæŋk juː/', example: 'Thank you for your help.', exampleTrans: '谢谢你的帮助。', partOfSpeech: 'phr.' },
          { id: 'v4', word: 'please', translation: '请', pronunciation: '/pliːz/', example: 'Please sit down.', exampleTrans: '请坐。', partOfSpeech: 'adv.' },
        ],
        grammar: [
          { id: 'g1', prompt: '___ name is Tom.', type: 'fill', answer: 'My', explanation: '形容词性物主代词 My 修饰 name。' },
          { id: 'g2', prompt: 'How ___ you?', type: 'choice', options: ['am', 'is', 'are'], answer: 'are', explanation: 'you 搭配 are。' },
          { id: 'g3', prompt: 'Nice ___ meet you.', type: 'fill', answer: 'to', explanation: '固定搭配 nice to meet you。' },
        ],
        speaking: [
          { id: 's1', text: 'Hello, my name is Tom.', translation: '你好，我叫汤姆。' },
          { id: 's2', text: 'How are you today?', translation: '你今天好吗？' },
        ],
        listening: [
          { id: 'l1', text: 'Good morning. How are you?', translation: '早上好。你好吗？', question: '说话人在做什么？', options: ['道别', '问候', '道歉', '感谢'], answer: 1 },
        ],
      },
      {
        id: 'en-a1-l2',
        title: 'Numbers 数字',
        description: '掌握 1-100 的数字表达',
        xp: 30,
        vocab: [
          { id: 'v1', word: 'one', translation: '一', pronunciation: '/wʌn/', example: 'I have one apple.', exampleTrans: '我有一个苹果。', partOfSpeech: 'num.' },
          { id: 'v2', word: 'ten', translation: '十', pronunciation: '/ten/', example: 'Ten students are here.', exampleTrans: '有十个学生在这里。', partOfSpeech: 'num.' },
          { id: 'v3', word: 'hundred', translation: '一百', pronunciation: '/ˈhʌndrəd/', example: 'One hundred dollars.', exampleTrans: '一百美元。', partOfSpeech: 'num.' },
        ],
        grammar: [
          { id: 'g1', prompt: 'I have ___ (三) books.', type: 'fill', answer: 'three', explanation: '三的英文是 three。' },
          { id: 'g2', prompt: 'There ___ five apples.', type: 'choice', options: ['is', 'are', 'am'], answer: 'are', explanation: '复数名词用 are。' },
        ],
        speaking: [
          { id: 's1', text: 'I am twenty years old.', translation: '我二十岁。' },
          { id: 's2', text: 'There are seven days in a week.', translation: '一周有七天。' },
        ],
        listening: [
          { id: 'l1', text: 'My phone number is 138-0013-8000.', translation: '我的电话号码是 138-0013-8000。', question: '数字中有几个 0？', options: ['3', '4', '5', '6'], answer: 2 },
        ],
      },
    ],
  },
  {
    id: 'en-b1',
    language: 'en',
    level: 'B1 中级',
    title: '英语中级：职场沟通',
    description: '提升职场英语，掌握邮件、会议与谈判表达。',
    color: 'from-indigo-400 to-purple-500',
    lessons: [
      {
        id: 'en-b1-l1',
        title: 'Business Email 商务邮件',
        description: '学习正式邮件的撰写结构',
        xp: 50,
        vocab: [
          { id: 'v1', word: 'regarding', translation: '关于', pronunciation: '/rɪˈɡɑːrdɪŋ/', example: 'I am writing regarding the meeting.', exampleTrans: '我写信是关于这次会议。', partOfSpeech: 'prep.' },
          { id: 'v2', word: 'attach', translation: '附上', pronunciation: '/əˈtætʃ/', example: 'Please find the attached file.', exampleTrans: '请查收附件。', partOfSpeech: 'v.' },
          { id: 'v3', word: 'deadline', translation: '截止日期', pronunciation: '/ˈdedlaɪn/', example: 'The deadline is Friday.', exampleTrans: '截止日期是周五。', partOfSpeech: 'n.' },
        ],
        grammar: [
          { id: 'g1', prompt: 'I look forward to ___ from you.', type: 'choice', options: ['hear', 'hearing', 'heard'], answer: 'hearing', explanation: 'look forward to 后接动名词。' },
          { id: 'g2', prompt: 'Please ___ me know if you have questions.', type: 'fill', answer: 'let', explanation: '固定搭配 let me know。' },
        ],
        speaking: [
          { id: 's1', text: 'I would like to schedule a meeting.', translation: '我想安排一次会议。' },
          { id: 's2', text: 'Could you please send me the report?', translation: '你能把报告发给我吗？' },
        ],
        listening: [
          { id: 'l1', text: 'The deadline for the project has been moved to next Monday.', translation: '项目的截止日期已推迟到下周一。', question: '截止日期是什么时候？', options: ['本周五', '下周一', '下周三', '本月底'], answer: 1 },
        ],
      },
    ],
  },
  // ==================== JAPANESE ====================
  {
    id: 'ja-n5',
    language: 'ja',
    level: 'N5 入门',
    title: '日语入门：五十音与基础',
    description: '学习五十音图、基础词汇与简单句型。',
    color: 'from-rose-400 to-pink-500',
    lessons: [
      {
        id: 'ja-n5-l1',
        title: 'あいさつ 问候',
        description: '学习日语基本问候语',
        xp: 30,
        vocab: [
          { id: 'v1', word: 'こんにちは', translation: '你好', pronunciation: 'konnichiwa', example: 'こんにちは、田中さん。', exampleTrans: '你好，田中先生。', partOfSpeech: '感.' },
          { id: 'v2', word: 'ありがとう', translation: '谢谢', pronunciation: 'arigatou', example: 'どうもありがとう。', exampleTrans: '非常感谢。', partOfSpeech: '感.' },
          { id: 'v3', word: 'さようなら', translation: '再见', pronunciation: 'sayounara', example: 'さようなら、また明日。', exampleTrans: '再见，明天见。', partOfSpeech: '感.' },
          { id: 'v4', word: 'はじめまして', translation: '初次见面', pronunciation: 'hajimemashite', example: 'はじめまして、よろしく。', exampleTrans: '初次见面，请多关照。', partOfSpeech: 'phr.' },
        ],
        grammar: [
          { id: 'g1', prompt: 'わたし___学生です。', type: 'choice', options: ['は', 'が', 'を'], answer: 'は', explanation: '主题助词 は 提示主语。' },
          { id: 'g2', prompt: 'これ___本です。', type: 'fill', answer: 'は', explanation: 'これは本です（这是书）。' },
        ],
        speaking: [
          { id: 's1', text: 'はじめまして、わたしは田中です。', translation: '初次见面，我是田中。' },
          { id: 's2', text: 'ありがとうございます。', translation: '非常感谢。' },
        ],
        listening: [
          { id: 'l1', text: 'おはようございます。きょうはいいてんきですね。', translation: '早上好。今天天气真好啊。', question: '说话人在问候什么？', options: ['晚安', '早上好', '再见', '谢谢'], answer: 1 },
        ],
      },
      {
        id: 'ja-n5-l2',
        title: '数字 数字',
        description: '日语数字与量词基础',
        xp: 30,
        vocab: [
          { id: 'v1', word: 'いち', translation: '一', pronunciation: 'ichi', example: 'りんごをいちこください。', exampleTrans: '请给我一个苹果。', partOfSpeech: '数.' },
          { id: 'v2', word: 'に', translation: '二', pronunciation: 'ni', example: 'ふたりでいきます。', exampleTrans: '两个人去。', partOfSpeech: '数.' },
          { id: 'v3', word: 'じゅう', translation: '十', pronunciation: 'juu', example: 'じゅうにんいます。', exampleTrans: '有十个人。', partOfSpeech: '数.' },
        ],
        grammar: [
          { id: 'g1', prompt: 'りんごを___(三)つください。', type: 'fill', answer: 'みっ', explanation: '三つ（mittsu）三个。' },
        ],
        speaking: [
          { id: 's1', text: 'わたしはにじゅうさいです。', translation: '我二十岁。' },
        ],
        listening: [
          { id: 'l1', text: 'でんわばんごうはさんきゅうはちのぜろはちです。', translation: '电话号码是 398-0808。', question: '号码中有几个 0？', options: ['1', '2', '3', '4'], answer: 2 },
        ],
      },
    ],
  },
  {
    id: 'ja-n3',
    language: 'ja',
    level: 'N3 中级',
    title: '日语中级：生活场景',
    description: '掌握餐厅、购物、出行等场景表达。',
    color: 'from-orange-400 to-red-500',
    lessons: [
      {
        id: 'ja-n3-l1',
        title: 'レストラン 餐厅',
        description: '在餐厅点餐与交流',
        xp: 50,
        vocab: [
          { id: 'v1', word: '注文', translation: '点餐', pronunciation: 'chuumon', example: '注文をお願いします。', exampleTrans: '我要点餐。', partOfSpeech: '名.' },
          { id: 'v2', word: '美味しい', translation: '美味的', pronunciation: 'oishii', example: 'この料理は美味しいです。', exampleTrans: '这道菜很好吃。', partOfSpeech: '形.' },
        ],
        grammar: [
          { id: 'g1', prompt: 'メニューを___ください。', type: 'choice', options: ['見せて', '見て', '見えて'], answer: '見せて', explanation: '見せてください 请给我看。' },
        ],
        speaking: [
          { id: 's1', text: 'すみません、注文お願いします。', translation: '不好意思，我要点餐。' },
        ],
        listening: [
          { id: 'l1', text: '店内は禁煙です。ご協力お願いします。', translation: '店内禁止吸烟，请您配合。', question: '店内有什么规定？', options: ['禁止拍照', '禁止吸烟', '禁止饮食', '禁止交谈'], answer: 1 },
        ],
      },
    ],
  },
  // ==================== KOREAN ====================
  {
    id: 'ko-1',
    language: 'ko',
    level: 'TOPIK I 初级',
    title: '韩语入门：基础会话',
    description: '学习韩语字母、基础问候与日常表达。',
    color: 'from-emerald-400 to-teal-500',
    lessons: [
      {
        id: 'ko-1-l1',
        title: '인사 问候',
        description: '韩语基本问候语',
        xp: 30,
        vocab: [
          { id: 'v1', word: '안녕하세요', translation: '你好', pronunciation: 'annyeonghaseyo', example: '안녕하세요, 만나서 반갑습니다.', exampleTrans: '你好，很高兴见到你。', partOfSpeech: '감.' },
          { id: 'v2', word: '감사합니다', translation: '谢谢', pronunciation: 'gamsahamnida', example: '도와주셔서 감사합니다.', exampleTrans: '感谢您的帮助。', partOfSpeech: '감.' },
          { id: 'v3', word: '안녕히 가세요', translation: '再见', pronunciation: 'annyeonghi gaseyo', example: '안녕히 가세요, 내일 봐요.', exampleTrans: '再见，明天见。', partOfSpeech: 'phr.' },
          { id: 'v4', word: '만나서 반갑습니다', translation: '很高兴见到你', pronunciation: 'mannaseo bangapseumnida', example: '처음 뵙겠습니다.', exampleTrans: '初次见面。', partOfSpeech: 'phr.' },
        ],
        grammar: [
          { id: 'g1', prompt: '저는 학생___.', type: 'choice', options: ['입니다', '이에요', '입니다'], answer: '입니다', explanation: '名词后接 입니다/이에요 表判断。' },
          { id: 'g2', prompt: '이것___ 책이에요.', type: 'fill', answer: '은', explanation: '은/는 为主题助词。' },
        ],
        speaking: [
          { id: 's1', text: '안녕하세요, 저는 김민수입니다.', translation: '你好，我是金民秀。' },
          { id: 's2', text: '만나서 반갑습니다.', translation: '很高兴见到你。' },
        ],
        listening: [
          { id: 'l1', text: '좋은 아침입니다. 오늘 날씨가 참 좋네요.', translation: '早上好。今天天气真好。', question: '说话人在问候什么？', options: ['晚安', '早上好', '再见', '谢谢'], answer: 1 },
        ],
      },
      {
        id: 'ko-1-l2',
        title: '숫자 数字',
        description: '韩语数字表达',
        xp: 30,
        vocab: [
          { id: 'v1', word: '하나', translation: '一', pronunciation: 'hana', example: '사과 하나 주세요.', exampleTrans: '请给我一个苹果。', partOfSpeech: '수.' },
          { id: 'v2', word: '열', translation: '十', pronunciation: 'yeol', example: '열 명 있습니다.', exampleTrans: '有十个人。', partOfSpeech: '수.' },
        ],
        grammar: [
          { id: 'g1', prompt: '저는 스무 ___ 입니다.', type: 'fill', answer: '살', explanation: '살 为年龄量词。' },
        ],
        speaking: [
          { id: 's1', text: '저는 스무 살입니다.', translation: '我二十岁。' },
        ],
        listening: [
          { id: 'l1', text: '제 전화번호는 공일공-일이삼사-오육칠팔입니다.', translation: '我的电话号码是 010-1234-5678。', question: '号码的中间部分是？', options: ['1234', '5678', '0101', '3456'], answer: 0 },
        ],
      },
    ],
  },
  {
    id: 'ko-2',
    language: 'ko',
    level: 'TOPIK II 中级',
    title: '韩语中级：日常交流',
    description: '深入掌握购物、餐饮与问路等场景。',
    color: 'from-cyan-400 to-blue-500',
    lessons: [
      {
        id: 'ko-2-l1',
        title: '식당 餐厅',
        description: '餐厅点餐用语',
        xp: 50,
        vocab: [
          { id: 'v1', word: '주문', translation: '点餐', pronunciation: 'jumun', example: '주문할게요.', exampleTrans: '我要点餐。', partOfSpeech: '名.' },
          { id: 'v2', word: '맛있다', translation: '好吃', pronunciation: 'masitda', example: '이 음식 정말 맛있어요.', exampleTrans: '这食物真好吃。', partOfSpeech: '形.' },
        ],
        grammar: [
          { id: 'g1', prompt: '메뉴판 좀 ___ 주세요.', type: 'choice', options: ['보여', '보여서', '보이게'], answer: '보여', explanation: '보여 주세요 请给我看。' },
        ],
        speaking: [
          { id: 's1', text: '저기요, 주문할게요.', translation: '服务员，我要点餐。' },
        ],
        listening: [
          { id: 'l1', text: '매장 내에서는 금연입니다. 양해 부탁드립니다.', translation: '店内禁止吸烟，请您谅解。', question: '店内规定是什么？', options: ['禁止拍照', '禁止吸烟', '禁止外带', '禁止交谈'], answer: 1 },
        ],
      },
    ],
  },
]
