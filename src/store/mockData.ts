import type {
  User,
  Project,
  ProjectMember,
  Chapter,
  ChapterVersion,
  Character,
  PlotPoint,
  ConflictWarning,
} from '@shared/types';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: '墨雨堂主',
    email: 'moyu@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=moyu',
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 'user-2',
    username: '清风剑客',
    email: 'qingfeng@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=qingfeng',
    createdAt: new Date('2025-02-10'),
  },
  {
    id: 'user-3',
    username: '烟雨楼主',
    email: 'yanyu@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yanyu',
    createdAt: new Date('2025-03-05'),
  },
];

export const mockMembers: ProjectMember[] = [
  {
    userId: 'user-1',
    user: mockUsers[0],
    role: 'creator',
    joinedAt: new Date('2025-06-01'),
  },
  {
    userId: 'user-2',
    user: mockUsers[1],
    role: 'author',
    joinedAt: new Date('2025-06-05'),
  },
  {
    userId: 'user-3',
    user: mockUsers[2],
    role: 'author',
    joinedAt: new Date('2025-06-10'),
  },
];

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    title: '星辰之海',
    description: '一部关于星际航行与人类命运的长篇科幻小说。在遥远的未来，人类踏上了寻找新家园的旅程，却在宇宙深处发现了改变文明走向的秘密……',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=epic%20space%20ocean%20with%20stars%20and%20galaxy%20scifi%20fantasy%20book%20cover&image_size=landscape_16_9',
    creatorId: 'user-1',
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2026-06-10'),
    members: mockMembers,
  },
  {
    id: 'project-2',
    title: '长安异闻录',
    description: '盛唐长安，暗流涌动。大理寺少卿与神秘少女联手破解一桩桩离奇案件，却发现背后隐藏着动摇王朝根基的惊天阴谋。',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20chinese%20tang%20dynasty%20city%20of%20changan%20mystery%20detective%20book%20cover&image_size=landscape_16_9',
    creatorId: 'user-2',
    createdAt: new Date('2025-08-15'),
    updatedAt: new Date('2026-05-20'),
    members: [mockMembers[1], mockMembers[0]],
  },
];

export const mockChapters: Chapter[] = [
  {
    id: 'chapter-1',
    projectId: 'project-1',
    title: '第一章 启航',
    content: `公元2157年，地球轨道。

"星辰号"静静停泊在联合太空站的三号船坞，这艘长达三公里的星际殖民舰是人类有史以来建造的最伟大的工程奇迹。它承载着十万名精选的殖民者，以及人类文明延续的全部希望。

林远站在观景窗前，望着那颗蓝色的星球，心中百感交集。作为"星辰号"的首席天文官，他知道这一去，便是永别。

"在想什么？"身后传来熟悉的声音。

林远没有回头，轻声说道："在想我们这一走，地球上的人会怎么看我们。是勇士，还是逃兵？"

苏婉走到他身边，和他并肩而立。这位"星辰号"的医疗主管有着一双温柔却坚定的眼睛。

"历史会给出答案的，"她轻轻说，"而我们的使命，是让人类这个名字，不再局限于这颗星球。"

通讯器突然响起，舰长的声音传遍全舰："所有人员请注意，启航倒计时十分钟。请各部门做好最终检查。"

林深深吸了一口气，握住了苏婉的手。

"走吧，"他说，"该去创造历史了。"

随着倒计时的结束，"星辰号"的引擎发出低沉的轰鸣。在亿万地球人的注视下，这艘承载着人类未来的巨舰，缓缓驶向了那片无垠的星海。

前方，是未知；身后，是故乡。

而属于他们的传奇，才刚刚开始。`,
    order: 1,
    wordCount: 587,
    createdAt: new Date('2025-06-10'),
    updatedAt: new Date('2026-06-12'),
  },
  {
    id: 'chapter-2',
    projectId: 'project-1',
    title: '第二章 异常信号',
    content: `航行第三年，深空。

"星辰号"已经离开太阳系，进入了真正的星际空间。船上的殖民者大多进入了低温休眠状态，只有几百名船员保持清醒，负责日常维护。

林远正在天文观测室例行扫描深空背景辐射，突然，监测屏幕上出现了一个奇怪的波形。

"嗯？"他皱起眉头，调整了接收频率。

那个信号再次出现了——有规律的脉冲，间隔精确到毫秒，绝不可能是自然现象。

"苏婉，你来看一下，"林远呼叫道，"我收到了一个奇怪的信号。"

苏婉很快赶到，她看着屏幕上的波形，脸色也变得凝重起来。

"这是……人工信号？"

"可能性超过90%，"林远飞快地计算着，"信号源距离我们大约12光年，方向是……天琴座方向。"

"我们的航线正好要经过那里！"苏婉惊道。

林远点了点头，神色复杂："是的。而且根据信号强度分析……发出信号的文明，技术水平可能不在我们之下。"

这个发现让整个船员都震动了。舰长召开了紧急会议。

"我们有两个选择，"舰长指着星图，"一是改变航线，避开这个区域；二是继续前进，尝试接触。"

大副立刻反对："太危险了！我们对这个文明一无所知，万一有敌意怎么办？我们肩负着人类延续的使命，不能冒险！"

"但如果是友好的呢？"苏婉反驳道，"我们在宇宙中不再孤独，这对人类文明的意义是无法估量的。"

争论持续了很久。最终，舰长看向林远："林首席，你的意见？"

林远沉默了片刻，缓缓说道："舰长，各位。我们之所以踏上这条旅程，不就是为了探索未知吗？如果遇到一点未知就退缩，那人类永远也走不出太阳系。"

他顿了顿，目光坚定："我建议，继续前进。但是，保持最高警戒。"

会议最终决定：保持原航线，同时进入一级战备状态。

消息传开，有人兴奋，有人担忧。而林远站在观测窗前，望着那片无尽的星空，心中既期待又不安。

他不知道，这个决定，将把人类带向一个从未想象过的未来。

而那个神秘的信号，仿佛是宇宙对人类的第一声问候。

或者，是警告。`,
    order: 2,
    wordCount: 723,
    lock: {
      userId: 'user-2',
      user: mockUsers[1],
      lockedAt: new Date(Date.now() - 1000 * 60 * 15),
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    },
    createdAt: new Date('2025-07-15'),
    updatedAt: new Date('2026-06-14'),
  },
  {
    id: 'chapter-3',
    projectId: 'project-1',
    title: '第三章 神秘遗迹',
    content: `航行第五年，距离信号源还有三天航程。

"星辰号"已经进入了一个异常的星域。这里的星图与数据库中的记录完全不符，仿佛有什么东西改变了这片区域的空间结构。

"舰长，前方发现异常！"领航员突然喊道。

所有人都看向主屏幕。在那里，一个巨大的、不规则的金属结构静静地漂浮在虚空中。它的直径超过了一百公里，表面布满了复杂到令人窒息的符文。

"这是什么？"有人失声问道。

林远的脸色苍白："根据碳14测年……这个遗迹的年龄，至少有五十万年。"

整个舰桥陷入了死寂。

五十万年。人类文明才不过五千年。

"启动探测器，"舰长的声音有些颤抖，"小心靠近。"

探测器缓缓靠近那座古老的遗迹。当镜头对准表面的符文时，林远的瞳孔骤然收缩。

"等等……这些符号……"他站起来，凑近屏幕，"我见过类似的！"

"什么？"苏婉惊讶地看着他。

"在西藏的古格王朝遗址，我参与过一次考古发掘，"林远快速地说，"那里的壁画上，就有类似的符号！"

所有人都惊呆了。

地球西藏的古代壁画，和五十万年前的外星遗迹，竟然有相同的符号？

"这不可能……"大副喃喃道。

探测器传回了更多数据。遗迹内部似乎已经废弃，但核心区域仍然有微弱的能量反应。更令人震惊的是，在遗迹的一个舱室里，探测器发现了壁画——

画面上，一群身材高大的人形生物，正在向另一个星球播撒着什么。而那颗星球，赫然就是地球。

"我的上帝……"苏婉捂住了嘴。

林远感到一阵眩晕。一个可怕的猜想在他脑海中形成——

人类的起源，或许并不在地球。

或者说，人类文明的发展，从一开始就被某种力量干预过。

"舰长，"林远的声音有些沙哑，"我建议……我们进去看看。"

舰长看着屏幕上那座古老的遗迹，又看了看舰桥上那些震惊的船员。

五十万年的秘密，就在眼前。

而他们，将成为第一批触碰真相的人类。

"准备登陆舱，"舰长深吸一口气，"林远、苏婉，你们跟我来。"`,
    order: 3,
    wordCount: 689,
    createdAt: new Date('2025-08-20'),
    updatedAt: new Date('2026-06-10'),
  },
  {
    id: 'chapter-4',
    projectId: 'project-1',
    title: '第四章 造物主',
    content: `（本章正在创作中……）

林远踏入遗迹的那一刻，仿佛走进了时间的洪流。

五十万年的光阴在这座巨大的建筑中凝固，每一步都像是踩在历史的脉搏上。`,
    order: 4,
    wordCount: 86,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-06-15'),
  },
];

export const mockChapterVersions: ChapterVersion[] = [
  {
    id: 'version-1-1',
    chapterId: 'chapter-1',
    content: `公元2157年，地球。

"星辰号"准备启航。林远作为首席天文官，心情复杂。

苏婉安慰他，历史会给出答案。

他们启航了。`,
    authorId: 'user-1',
    author: mockUsers[0],
    changeSummary: '创建初稿',
    createdAt: new Date('2025-06-10T10:00:00'),
  },
  {
    id: 'version-1-2',
    chapterId: 'chapter-1',
    content: `公元2157年，地球轨道。

"星辰号"静静停泊在联合太空站的三号船坞，这艘长达三公里的星际殖民舰是人类有史以来建造的最伟大的工程奇迹。

林远站在观景窗前，望着那颗蓝色的星球，心中百感交集。

"在想什么？"身后传来熟悉的声音。

林远没有回头，轻声说道："在想我们这一走，地球上的人会怎么看我们。是勇士，还是逃兵？"

苏婉走到他身边，和他并肩而立。

"历史会给出答案的，"她轻轻说，"而我们的使命，是让人类这个名字，不再局限于这颗星球。"

启航倒计时开始。

林远深深吸了一口气，握住了苏婉的手。

"走吧，"他说，"该去创造历史了。"

随着倒计时的结束，"星辰号"缓缓驶向了那片无垠的星海。

前方，是未知；身后，是故乡。

而属于他们的传奇，才刚刚开始。`,
    authorId: 'user-1',
    author: mockUsers[0],
    changeSummary: '丰富场景描写和人物对话',
    createdAt: new Date('2025-06-10T15:30:00'),
  },
  {
    id: 'version-1-3',
    chapterId: 'chapter-1',
    content: mockChapters[0].content,
    authorId: 'user-2',
    author: mockUsers[1],
    changeSummary: '完善启航场景，增加细节描写',
    createdAt: new Date('2026-06-12T09:15:00'),
  },
  {
    id: 'version-2-1',
    chapterId: 'chapter-2',
    content: `航行第三年。

林远发现了一个奇怪的信号。

苏婉来查看，确认是人工信号。

信号源在天琴座方向，距离12光年。

他们的航线正好经过那里。`,
    authorId: 'user-2',
    author: mockUsers[1],
    changeSummary: '创建第二章初稿',
    createdAt: new Date('2025-07-15T11:00:00'),
  },
  {
    id: 'version-2-2',
    chapterId: 'chapter-2',
    content: mockChapters[1].content,
    authorId: 'user-2',
    author: mockUsers[1],
    changeSummary: '完善章节内容，增加会议争论情节',
    createdAt: new Date('2026-06-14T16:45:00'),
  },
];

export const mockCharacters: Character[] = [
  {
    id: 'char-1',
    projectId: 'project-1',
    name: '林远',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linyuan',
    description: '"星辰号"首席天文官，35岁。性格冷静理智，观察力敏锐，是团队中的智囊。出生于天文学世家，从小就对星空充满向往。',
    traits: {
      age: '35岁',
      occupation: '首席天文官',
      personality: '冷静、理智、执着',
      background: '天文学世家',
      speciality: '深空观测、数据分析',
    },
    relationships: [
      {
        id: 'rel-1',
        characterId: 'char-1',
        targetId: 'char-2',
        target: {} as any,
        type: '恋人',
        description: '与苏婉是恋人关系，在航行中相互扶持',
      },
      {
        id: 'rel-2',
        characterId: 'char-1',
        targetId: 'char-3',
        target: {} as any,
        type: '上下级',
        description: '舰长对林远十分信任，常采纳他的建议',
      },
    ],
    appearances: [
      {
        id: 'app-1',
        characterId: 'char-1',
        chapterId: 'chapter-1',
        chapter: mockChapters[0],
        context: '第一章主角出场',
        createdAt: new Date('2025-06-10'),
      },
      {
        id: 'app-2',
        characterId: 'char-1',
        chapterId: 'chapter-2',
        chapter: mockChapters[1],
        context: '发现异常信号',
        createdAt: new Date('2025-07-15'),
      },
    ],
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2026-06-10'),
  },
  {
    id: 'char-2',
    projectId: 'project-1',
    name: '苏婉',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=suwan',
    description: '"星辰号"医疗主管，32岁。温柔善良，但外柔内刚，在关键时刻总能保持镇定。她不仅是团队的医生，更是大家的心灵支柱。',
    traits: {
      age: '32岁',
      occupation: '医疗主管',
      personality: '温柔、坚定、有同情心',
      background: '医学世家',
      speciality: '太空医学、心理学',
    },
    relationships: [
      {
        id: 'rel-3',
        characterId: 'char-2',
        targetId: 'char-1',
        target: {} as any,
        type: '恋人',
        description: '与林远是恋人关系',
      },
    ],
    appearances: [
      {
        id: 'app-3',
        characterId: 'char-2',
        chapterId: 'chapter-1',
        chapter: mockChapters[0],
        context: '与林远在观景台对话',
        createdAt: new Date('2025-06-10'),
      },
    ],
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2026-05-20'),
  },
  {
    id: 'char-3',
    projectId: 'project-1',
    name: '陈舰长',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chen',
    description: '"星辰号"舰长，50岁。经验丰富的太空老兵，曾指挥过多次深空探测任务。外表严厉，内心却十分关心每一位船员。',
    traits: {
      age: '50岁',
      occupation: '舰长',
      personality: '沉稳、果断、有担当',
      background: '海军出身，转入太空军',
      speciality: '舰艇指挥、危机处理',
    },
    relationships: [],
    appearances: [
      {
        id: 'app-4',
        characterId: 'char-3',
        chapterId: 'chapter-2',
        chapter: mockChapters[1],
        context: '主持紧急会议',
        createdAt: new Date('2025-07-15'),
      },
    ],
    createdAt: new Date('2025-06-05'),
    updatedAt: new Date('2026-04-15'),
  },
  {
    id: 'char-4',
    projectId: 'project-1',
    name: '大副王磊',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanglei',
    description: '"星辰号"大副，40岁。行事谨慎，注重安全。与林远在决策上常有分歧，但都是为了船员的安全着想。',
    traits: {
      age: '40岁',
      occupation: '大副',
      personality: '谨慎、务实、保守',
      background: '工程师出身',
      speciality: '舰船维护、安全管理',
    },
    relationships: [],
    appearances: [
      {
        id: 'app-5',
        characterId: 'char-4',
        chapterId: 'chapter-2',
        chapter: mockChapters[1],
        context: '反对接触外星文明',
        createdAt: new Date('2025-07-15'),
      },
    ],
    createdAt: new Date('2025-06-10'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    id: 'char-5',
    projectId: 'project-1',
    name: '神秘文明',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mystery',
    description: '五十万年前的古老文明，在银河系中留下了无数遗迹。他们与人类的起源似乎有着千丝万缕的联系……',
    traits: {
      age: '五十万年前',
      occupation: '未知',
      personality: '神秘、未知',
      background: '可能创造了人类',
      speciality: '超级科技',
    },
    relationships: [],
    appearances: [],
    createdAt: new Date('2025-08-20'),
    updatedAt: new Date('2026-06-10'),
  },
];

mockCharacters[0].relationships[0].target = mockCharacters[1];
mockCharacters[0].relationships[1].target = mockCharacters[2];
mockCharacters[1].relationships[0].target = mockCharacters[0];

export const mockPlotPoints: PlotPoint[] = [
  {
    id: 'plot-1',
    projectId: 'project-1',
    title: '神秘信号伏笔',
    description: '第一章中林远在观景台时，隐约感到星空中有什么在注视着他们，但他当时以为是错觉。这个伏笔在第二章揭示为外星信号。',
    type: 'foreshadow',
    status: 'resolved',
    relatedChapterIds: ['chapter-1', 'chapter-2'],
    relatedCharacterIds: ['char-1'],
    hints: [
      {
        id: 'hint-1',
        plotPointId: 'plot-1',
        chapterId: 'chapter-1',
        chapter: mockChapters[0],
        hintText: '林远望着星空，"总觉得有什么东西在那里，在等待着我们"',
        locationDescription: '第一章中段，林远与苏婉对话时的心理活动',
        createdAt: new Date('2025-06-10'),
      },
      {
        id: 'hint-2',
        plotPointId: 'plot-1',
        chapterId: 'chapter-2',
        chapter: mockChapters[1],
        hintText: '林远发现了规律的脉冲信号',
        locationDescription: '第二章开头',
        createdAt: new Date('2025-07-15'),
      },
    ],
    createdAt: new Date('2025-06-10'),
  },
  {
    id: 'plot-2',
    projectId: 'project-1',
    title: '人类起源之谜',
    description: '西藏古格王朝的壁画与外星遗迹符号相同，暗示人类文明与外星文明有着千丝万缕的联系。这个悬念将贯穿整部小说。',
    type: 'foreshadow',
    status: 'active',
    relatedChapterIds: ['chapter-3'],
    relatedCharacterIds: ['char-1', 'char-5'],
    hints: [
      {
        id: 'hint-3',
        plotPointId: 'plot-2',
        chapterId: 'chapter-3',
        chapter: mockChapters[2],
        hintText: '林远认出遗迹符文与西藏古格壁画相似',
        locationDescription: '第三章中段，发现遗迹符文时',
        createdAt: new Date('2025-08-20'),
      },
      {
        id: 'hint-4',
        plotPointId: 'plot-2',
        chapterId: 'chapter-3',
        chapter: mockChapters[2],
        hintText: '遗迹壁画显示人形生物向地球播撒生命',
        locationDescription: '第三章后半段',
        createdAt: new Date('2025-08-20'),
      },
    ],
    createdAt: new Date('2025-08-20'),
  },
  {
    id: 'plot-3',
    projectId: 'project-1',
    title: '林远的秘密',
    description: '林远身上有一个连他自己都不知道的秘密——他的基因中含有外星DNA。这将在第四章中揭晓。',
    type: 'foreshadow',
    status: 'pending',
    relatedChapterIds: ['chapter-4'],
    relatedCharacterIds: ['char-1', 'char-5'],
    hints: [
      {
        id: 'hint-5',
        plotPointId: 'plot-3',
        hintText: '林远从小就对天文有着超越常人的直觉，总能看到别人看不到的星象',
        locationDescription: '人物设定中的隐藏信息',
        createdAt: new Date('2026-01-10'),
      },
    ],
    createdAt: new Date('2026-01-10'),
  },
  {
    id: 'plot-4',
    projectId: 'project-1',
    title: '陈舰长的抉择',
    description: '作为舰长，陈舰长一直将船员的安全放在第一位。但在发现外星遗迹后，他将面临一个艰难的抉择：是保守秘密，还是告诉所有人真相？',
    type: 'turning',
    status: 'pending',
    relatedChapterIds: ['chapter-3', 'chapter-4'],
    relatedCharacterIds: ['char-3'],
    hints: [],
    createdAt: new Date('2025-08-20'),
  },
  {
    id: 'plot-5',
    projectId: 'project-1',
    title: '小说高潮：真相大白',
    description: '最终揭开人类起源的真相，以及神秘文明留下遗迹的真正目的。',
    type: 'climax',
    status: 'pending',
    relatedChapterIds: [],
    relatedCharacterIds: ['char-1', 'char-2', 'char-3', 'char-5'],
    hints: [],
    createdAt: new Date('2025-06-15'),
  },
];

export const mockConflictWarnings: ConflictWarning[] = [
  {
    id: 'conflict-1',
    chapterId: 'chapter-4',
    plotPointId: 'plot-2',
    plotPoint: mockPlotPoints[1],
    severity: 'warning',
    message: '本章正在创作关于林远身世的内容。请注意：已有的伏笔"人类起源之谜"中提到林远在西藏见过类似符文，建议在本章中呼应这一设定，避免人物行为逻辑出现矛盾。',
    lineNumber: 5,
    columnNumber: 10,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    resolved: false,
  },
  {
    id: 'conflict-2',
    chapterId: 'chapter-2',
    characterId: 'char-3',
    character: mockCharacters[2],
    severity: 'info',
    message: '本章中陈舰长主持了紧急会议。人物设定中提到陈舰长"外表严厉，内心关心船员"，当前描写符合设定。',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    resolved: true,
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60),
  },
];

export const currentUser: User = mockUsers[0];
