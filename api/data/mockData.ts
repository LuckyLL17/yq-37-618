import type {
  User,
  Project,
  ProjectMember,
  Chapter,
  ChapterVersion,
  Character,
  PlotPoint,
  ConflictWarning,
} from '../../shared/types.js';

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
    description: '一部关于星际航行与人类命运的长篇科幻小说。',
    creatorId: 'user-1',
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2026-06-10'),
    members: mockMembers,
  },
];

export const mockChapters: Chapter[] = [
  {
    id: 'chapter-1',
    projectId: 'project-1',
    title: '第一章 启航',
    content: '公元2157年，地球轨道。"星辰号"静静停泊在联合太空站的三号船坞...',
    order: 1,
    wordCount: 587,
    createdAt: new Date('2025-06-10'),
    updatedAt: new Date('2026-06-12'),
  },
  {
    id: 'chapter-2',
    projectId: 'project-1',
    title: '第二章 异常信号',
    content: '航行第三年，深空。"星辰号"已经离开太阳系...',
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
];

export const mockChapterVersions: ChapterVersion[] = [];
export const mockCharacters: Character[] = [];
export const mockPlotPoints: PlotPoint[] = [];
export const mockConflictWarnings: ConflictWarning[] = [];
