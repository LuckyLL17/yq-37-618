import { create } from 'zustand';
import type {
  User,
  Project,
  ProjectMember,
  Chapter,
  ChapterLock,
  ChapterVersion,
  Character,
  CharacterRelation,
  CharacterAppearance,
  PlotPoint,
  PlotHint,
  ConflictWarning,
  PdfExportConfig,
} from '@shared/types';
import {
  mockUsers,
  mockProjects,
  mockChapters,
  mockChapterVersions,
  mockCharacters,
  mockPlotPoints,
  mockConflictWarnings,
  currentUser as mockCurrentUser,
} from './mockData';
import { diff_match_patch, Diff } from 'diff-match-patch';

const STORAGE_KEY = 'novel-app-state';

interface AppState {
  currentUser: User;
  users: User[];
  projects: Project[];
  currentProject: Project | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  chapterVersions: ChapterVersion[];
  characters: Character[];
  plotPoints: PlotPoint[];
  conflictWarnings: ConflictWarning[];
  isLoading: boolean;

  setCurrentProject: (projectId: string) => void;
  setCurrentChapter: (chapterId: string | null) => void;
  updateChapterContent: (chapterId: string, content: string) => Promise<void>;
  lockChapter: (chapterId: string) => Promise<boolean>;
  unlockChapter: (chapterId: string) => Promise<void>;
  createVersion: (chapterId: string, summary: string) => Promise<void>;
  revertToVersion: (versionId: string) => Promise<void>;
  getDiff: (oldContent: string, newContent: string) => Diff[];
  getChapterVersions: (chapterId: string) => ChapterVersion[];
  getCharactersForChapter: (chapterId: string) => Character[];
  getPlotPointsForChapter: (chapterId: string) => PlotPoint[];
  checkConflicts: (chapterId: string) => Promise<ConflictWarning[]>;
  resolveConflict: (conflictId: string) => void;
  exportToPdf: (config: PdfExportConfig) => Promise<void>;
  createProject: (title: string, description: string) => Promise<Project>;
  createChapter: (projectId: string, title: string, parentId?: string) => Promise<Chapter>;
  updateChapterTitle: (chapterId: string, title: string) => void;
  createCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'relationships' | 'appearances'> & { relationships?: CharacterRelation[]; appearances?: CharacterAppearance[] }) => Promise<Character>;
  updateCharacter: (characterId: string, updates: Partial<Character>) => void;
  createPlotPoint: (plotPoint: Omit<PlotPoint, 'id' | 'createdAt' | 'hints'> & { hints?: PlotHint[] }) => Promise<PlotPoint>;
  updatePlotPoint: (plotPointId: string, updates: Partial<PlotPoint>) => void;
  addPlotHint: (plotPointId: string, hint: Omit<PlotHint, 'id' | 'createdAt'>) => void;
  checkExpiredLocks: () => void;
  autoSaveWithVersion: (chapterId: string, content: string) => Promise<void>;
}

const dmp = new diff_match_patch();

const dateReviver = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  return value;
};

const findUserById = (userId: string, users: User[]): User | undefined => {
  return users.find(u => u.id === userId);
};

const findChapterById = (chapterId: string | undefined, chapters: Chapter[]): Chapter | undefined => {
  if (!chapterId) return undefined;
  return chapters.find(c => c.id === chapterId);
};

const findCharacterById = (characterId: string | undefined, characters: Character[]): Character | undefined => {
  if (!characterId) return undefined;
  return characters.find(c => c.id === characterId);
};

const findPlotPointById = (plotPointId: string | undefined, plotPoints: PlotPoint[]): PlotPoint | undefined => {
  if (!plotPointId) return undefined;
  return plotPoints.find(p => p.id === plotPointId);
};

const buildLock = (lock: ChapterLock | undefined, users: User[]): ChapterLock | undefined => {
  if (!lock) return undefined;
  return {
    ...lock,
    user: findUserById(lock.userId, users) || lock.user,
  };
};

const buildMember = (member: ProjectMember, users: User[]): ProjectMember => {
  return {
    ...member,
    user: findUserById(member.userId, users) || member.user,
  };
};

const buildRelation = (rel: CharacterRelation, characters: Character[]): CharacterRelation => {
  const target = findCharacterById(rel.targetId, characters);
  return {
    ...rel,
    target,
  };
};

const buildAppearance = (app: CharacterAppearance, chapters: Chapter[]): CharacterAppearance => {
  const chapter = findChapterById(app.chapterId, chapters);
  return {
    ...app,
    chapter,
  };
};

const buildHint = (hint: PlotHint, chapters: Chapter[]): PlotHint => {
  const chapter = findChapterById(hint.chapterId, chapters);
  return {
    ...hint,
    chapter,
  };
};

const buildConflictWarning = (warning: ConflictWarning, plotPoints: PlotPoint[], characters: Character[]): ConflictWarning => {
  return {
    ...warning,
    plotPoint: findPlotPointById(warning.plotPointId, plotPoints),
    character: findCharacterById(warning.characterId, characters),
  };
};

const stripCircularRefs = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(item => stripCircularRefs(item)) as unknown as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === 'user' || key === 'target' || key === 'chapter' || key === 'plotPoint' || key === 'character' || key === 'author') {
        continue;
      }
      result[key] = stripCircularRefs(value);
    }
    return result as T;
  }
  return obj;
};

const hydrateAllReferences = (data: {
  users: User[];
  projects: Project[];
  chapters: Chapter[];
  chapterVersions: ChapterVersion[];
  characters: Character[];
  plotPoints: PlotPoint[];
  conflictWarnings: ConflictWarning[];
}) => {
  const { users, chapters, characters, plotPoints } = data;

  const hydratedProjects = data.projects.map(p => ({
    ...p,
    members: p.members.map(m => buildMember(m, users)),
  }));

  const hydratedChapters = data.chapters.map(c => ({
    ...c,
    lock: buildLock(c.lock, users),
  }));

  const hydratedVersions = data.chapterVersions.map(v => ({
    ...v,
    author: findUserById(v.authorId, users) || v.author,
  }));

  const hydratedCharacters = data.characters.map(c => ({
    ...c,
    relationships: c.relationships.map(r => buildRelation(r, data.characters)),
    appearances: c.appearances.map(a => buildAppearance(a, chapters)),
  }));

  const hydratedPlotPoints = data.plotPoints.map(pp => ({
    ...pp,
    hints: pp.hints.map(h => buildHint(h, chapters)),
  }));

  const finalCharacters = hydratedCharacters.map(c => ({
    ...c,
    relationships: c.relationships.map(r => ({
      ...r,
      target: hydratedCharacters.find(hc => hc.id === r.targetId) || r.target,
    })),
  }));

  const finalPlotPoints = hydratedPlotPoints.map(pp => ({
    ...pp,
    hints: pp.hints.map(h => ({
      ...h,
      chapter: hydratedChapters.find(hc => hc.id === h.chapterId) || h.chapter,
    })),
  }));

  const hydratedWarnings = data.conflictWarnings.map(w => {
    const built = buildConflictWarning(w, finalPlotPoints, finalCharacters);
    return built;
  });

  return {
    projects: hydratedProjects,
    chapters: hydratedChapters,
    chapterVersions: hydratedVersions,
    characters: finalCharacters,
    plotPoints: finalPlotPoints,
    conflictWarnings: hydratedWarnings,
  };
};

const loadFromStorage = (): Partial<AppState> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored, dateReviver) as Partial<AppState>;
  } catch {
    return null;
  }
};

const saveToStorage = (state: Partial<AppState>) => {
  try {
    const toSave = stripCircularRefs({
      projects: state.projects,
      chapters: state.chapters,
      chapterVersions: state.chapterVersions,
      characters: state.characters,
      plotPoints: state.plotPoints,
      conflictWarnings: state.conflictWarnings,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

const getInitialState = () => {
  const stored = loadFromStorage();
  const users = mockUsers;

  const rawData = {
    users,
    projects: stored?.projects?.length ? stored.projects : mockProjects,
    chapters: stored?.chapters?.length ? stored.chapters : mockChapters,
    chapterVersions: stored?.chapterVersions?.length ? stored.chapterVersions : mockChapterVersions,
    characters: stored?.characters?.length ? stored.characters : mockCharacters,
    plotPoints: stored?.plotPoints?.length ? stored.plotPoints : mockPlotPoints,
    conflictWarnings: stored?.conflictWarnings?.length ? stored.conflictWarnings : mockConflictWarnings,
  };

  const hydrated = hydrateAllReferences(rawData);

  return {
    currentUser: mockCurrentUser,
    users,
    projects: hydrated.projects,
    currentProject: null as Project | null,
    chapters: hydrated.chapters,
    currentChapter: null as Chapter | null,
    chapterVersions: hydrated.chapterVersions,
    characters: hydrated.characters,
    plotPoints: hydrated.plotPoints,
    conflictWarnings: hydrated.conflictWarnings,
    isLoading: false,
  };
};

export const useAppStore = create<AppState>((set, get) => {
  const store: AppState = {
    ...getInitialState(),

    setCurrentProject: (projectId: string) => {
      const project = get().projects.find(p => p.id === projectId) || null;
      set({ currentProject: project, currentChapter: null });
    },

    setCurrentChapter: (chapterId: string | null) => {
      const chapter = chapterId
        ? get().chapters.find(c => c.id === chapterId) || null
        : null;
      set({ currentChapter: chapter });
    },

    updateChapterContent: async (chapterId: string, content: string) => {
      set({ isLoading: true });
      await new Promise(resolve => setTimeout(resolve, 300));

      const wordCount = content.replace(/\s/g, '').length;
      set(state => {
        const newState = {
          chapters: state.chapters.map(c =>
            c.id === chapterId
              ? { ...c, content, wordCount, updatedAt: new Date() }
              : c
          ),
          currentChapter: state.currentChapter?.id === chapterId
            ? { ...state.currentChapter, content, wordCount, updatedAt: new Date() }
            : state.currentChapter,
          isLoading: false,
        };
        saveToStorage(newState);
        return newState;
      });
    },

    lockChapter: async (chapterId: string): Promise<boolean> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const state = get();
      const chapter = state.chapters.find(c => c.id === chapterId);

      if (chapter?.lock && chapter.lock.userId !== state.currentUser.id) {
        return false;
      }

      const lock: ChapterLock = {
        userId: state.currentUser.id,
        user: state.currentUser,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      set(s => {
        const newState = {
          chapters: s.chapters.map(c =>
            c.id === chapterId ? { ...c, lock } : c
          ),
          currentChapter: s.currentChapter?.id === chapterId
            ? { ...s.currentChapter, lock }
            : s.currentChapter,
        };
        saveToStorage(newState);
        return newState;
      });

      return true;
    },

    unlockChapter: async (chapterId: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      set(s => {
        const newState = {
          chapters: s.chapters.map(c =>
            c.id === chapterId ? { ...c, lock: undefined } : c
          ),
          currentChapter: s.currentChapter?.id === chapterId
            ? { ...s.currentChapter, lock: undefined }
            : s.currentChapter,
        };
        saveToStorage(newState);
        return newState;
      });
    },

    createVersion: async (chapterId: string, summary: string) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const state = get();
      const chapter = state.chapters.find(c => c.id === chapterId);
      if (!chapter) return;

      const newVersion: ChapterVersion = {
        id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        chapterId,
        content: chapter.content,
        authorId: state.currentUser.id,
        author: state.currentUser,
        changeSummary: summary,
        createdAt: new Date(),
      };

      set(s => {
        const newState = {
          chapterVersions: [...s.chapterVersions, newVersion],
        };
        saveToStorage(newState);
        return newState;
      });
    },

    revertToVersion: async (versionId: string) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const state = get();
      const version = state.chapterVersions.find(v => v.id === versionId);
      if (!version) return;

      const wordCount = version.content.replace(/\s/g, '').length;

      set(s => {
        const newState = {
          chapters: s.chapters.map(c =>
            c.id === version.chapterId
              ? { ...c, content: version.content, wordCount, updatedAt: new Date() }
              : c
          ),
          currentChapter: s.currentChapter?.id === version.chapterId
            ? { ...s.currentChapter, content: version.content, wordCount, updatedAt: new Date() }
            : s.currentChapter,
        };
        saveToStorage(newState);
        return newState;
      });

      await get().createVersion(version.chapterId, `回滚到版本 ${version.createdAt.toLocaleString()}`);
    },

    getDiff: (oldContent: string, newContent: string): Diff[] => {
      return dmp.diff_main(oldContent, newContent);
    },

    getChapterVersions: (chapterId: string): ChapterVersion[] => {
      return get().chapterVersions
        .filter(v => v.chapterId === chapterId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    getCharactersForChapter: (chapterId: string): Character[] => {
      return get().characters.filter(c =>
        c.appearances.some(a => a.chapterId === chapterId)
      );
    },

    getPlotPointsForChapter: (chapterId: string): PlotPoint[] => {
      return get().plotPoints.filter(p =>
        p.relatedChapterIds.includes(chapterId) ||
        p.hints.some(h => h.chapterId === chapterId)
      );
    },

    checkConflicts: async (chapterId: string): Promise<ConflictWarning[]> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const state = get();
      const chapter = state.chapters.find(c => c.id === chapterId);
      if (!chapter) return [];

      const warnings: ConflictWarning[] = [];
      const content = chapter.content;

      const fuzzyMatch = (text: string, pattern: string): boolean => {
        if (!pattern || pattern.length < 2) return false;
        if (text.includes(pattern)) return true;
        const keyWords = pattern.split(/[\s,，。.；;！!？?、]+/).filter(w => w.length >= 2);
        const matchCount = keyWords.filter(kw => text.includes(kw)).length;
        return matchCount >= Math.ceil(keyWords.length * 0.6) && keyWords.length > 0;
      };

      state.plotPoints.forEach(plotPoint => {
        if (plotPoint.status === 'resolved') return;

        const relatedHints = plotPoint.hints.filter(h => h.chapterId === chapterId);
        const isRelatedChapter = plotPoint.relatedChapterIds.includes(chapterId);

        if (relatedHints.length > 0 || isRelatedChapter) {
          plotPoint.hints.forEach(hint => {
            if (hint.chapterId === chapterId) {
              const isMentioned = fuzzyMatch(content, hint.hintText);
              if (isMentioned) {
                const hintKey = hint.hintText.slice(0, Math.min(20, hint.hintText.length));
                const lines = content.split('\n');
                let lineNumber = -1;
                lines.forEach((line, idx) => {
                  if (fuzzyMatch(line, hintKey)) {
                    lineNumber = idx + 1;
                  }
                });

                warnings.push({
                  id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  chapterId,
                  plotPointId: plotPoint.id,
                  plotPoint,
                  severity: 'info',
                  message: `检测到伏笔"${plotPoint.title}"的线索：${hint.hintText}。请确保与后续情节保持一致。`,
                  lineNumber: lineNumber > 0 ? lineNumber : undefined,
                  createdAt: new Date(),
                  resolved: false,
                });
              }
            }
          });

          if (plotPoint.status === 'pending' && isRelatedChapter) {
            const hasResolvedHint = plotPoint.hints.some(h =>
              h.chapterId === chapterId && fuzzyMatch(content, h.hintText)
            );
            if (!hasResolvedHint) {
              warnings.push({
                id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                chapterId,
                plotPointId: plotPoint.id,
                plotPoint,
                severity: 'warning',
                message: `本章关联了伏笔"${plotPoint.title}"，但该伏笔尚未解决。如果本章内容涉及该伏笔的进展，请更新伏笔状态。`,
                createdAt: new Date(),
                resolved: false,
              });
            }
          }

          const descMentioned = fuzzyMatch(content, plotPoint.title) ||
            (plotPoint.description.length > 5 && fuzzyMatch(content, plotPoint.description.slice(0, 30)));
          if (descMentioned && plotPoint.status === 'pending') {
            const alreadyWarned = warnings.some(w => w.plotPointId === plotPoint.id);
            if (!alreadyWarned) {
              warnings.push({
                id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                chapterId,
                plotPointId: plotPoint.id,
                plotPoint,
                severity: 'info',
                message: `本章内容提到了伏笔"${plotPoint.title}"相关内容，请确保情节连贯。`,
                createdAt: new Date(),
                resolved: false,
              });
            }
          }
        }
      });

      state.characters
        .filter(c => c.projectId === chapter.projectId)
        .forEach(character => {
          if (content.includes(character.name)) {
            const relatedAppearance = character.appearances.find(a => a.chapterId === chapterId);
            if (!relatedAppearance) {
              warnings.push({
                id: `conflict-char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                chapterId,
                characterId: character.id,
                character,
                severity: 'info',
                message: `人物"${character.name}"在本章被提及，但未标记出场。`,
                createdAt: new Date(),
                resolved: false,
              });
            }
          }
        });

      set(s => {
        const newState = {
          conflictWarnings: [
            ...s.conflictWarnings.filter(c => c.chapterId !== chapterId || c.resolved),
            ...warnings,
          ],
        };
        saveToStorage(newState);
        return newState;
      });

      return warnings;
    },

    resolveConflict: (conflictId: string) => {
      set(s => {
        const newState = {
          conflictWarnings: s.conflictWarnings.map(c =>
            c.id === conflictId
              ? { ...c, resolved: true, resolvedAt: new Date() }
              : c
          ),
        };
        saveToStorage(newState);
        return newState;
      });
    },

    exportToPdf: async (config: PdfExportConfig) => {
      set({ isLoading: true });
      await new Promise(resolve => setTimeout(resolve, 500));

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '210mm';
      container.style.padding = '20mm 25mm';
      container.style.backgroundColor = '#ffffff';
      container.style.fontFamily = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';
      container.style.fontSize = '12pt';
      container.style.lineHeight = '1.8';
      container.style.color = '#1a1a1a';

      if (config.includeCover) {
        const cover = document.createElement('div');
        cover.style.height = '297mm';
        cover.style.display = 'flex';
        cover.style.flexDirection = 'column';
        cover.style.justifyContent = 'center';
        cover.style.alignItems = 'center';
        cover.style.backgroundColor = '#1e3a5f';
        cover.style.color = '#ffffff';
        cover.style.margin = '-20mm -25mm 20mm -25mm';
        cover.style.padding = '20mm 25mm';
        cover.style.pageBreakAfter = 'always';

        const titleEl = document.createElement('h1');
        titleEl.textContent = config.title;
        titleEl.style.fontSize = '36pt';
        titleEl.style.fontWeight = 'bold';
        titleEl.style.textAlign = 'center';
        titleEl.style.marginBottom = '30px';
        titleEl.style.fontFamily = 'inherit';
        cover.appendChild(titleEl);

        if (config.author) {
          const authorEl = document.createElement('p');
          authorEl.textContent = config.author;
          authorEl.style.fontSize = '14pt';
          authorEl.style.color = '#d4af37';
          authorEl.style.textAlign = 'center';
          authorEl.style.fontFamily = 'inherit';
          cover.appendChild(authorEl);
        }

        container.appendChild(cover);
      }

      if (config.includeToc) {
        const toc = document.createElement('div');
        toc.style.marginBottom = '20px';
        toc.style.pageBreakAfter = 'always';

        const tocTitle = document.createElement('h2');
        tocTitle.textContent = '目录';
        tocTitle.style.fontSize = '20pt';
        tocTitle.style.fontWeight = 'bold';
        tocTitle.style.color = '#1e3a5f';
        tocTitle.style.marginBottom = '15px';
        tocTitle.style.fontFamily = 'inherit';
        toc.appendChild(tocTitle);

        const tocList = document.createElement('div');
        config.chapterIds.forEach((chapterId, index) => {
          const chapter = get().chapters.find(c => c.id === chapterId);
          if (chapter) {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.marginBottom = '8px';
            item.style.fontSize = '12pt';
            item.innerHTML = `<span>${index + 1}. ${chapter.title}</span><span>................</span>`;
            tocList.appendChild(item);
          }
        });
        toc.appendChild(tocList);
        container.appendChild(toc);
      }

      config.chapterIds.forEach((chapterId) => {
        const chapter = get().chapters.find(c => c.id === chapterId);
        if (!chapter) return;

        const chapterDiv = document.createElement('div');
        chapterDiv.style.pageBreakBefore = 'always';
        chapterDiv.style.marginBottom = '20px';

        const titleEl = document.createElement('h2');
        titleEl.textContent = chapter.title;
        titleEl.style.fontSize = '18pt';
        titleEl.style.fontWeight = 'bold';
        titleEl.style.color = '#1e3a5f';
        titleEl.style.marginBottom = '12px';
        titleEl.style.paddingBottom = '8px';
        titleEl.style.borderBottom = '2px solid #d4af37';
        titleEl.style.fontFamily = 'inherit';
        chapterDiv.appendChild(titleEl);

        const contentEl = document.createElement('div');
        contentEl.style.whiteSpace = 'pre-wrap';
        contentEl.style.fontSize = `${config.fontSize}pt`;
        contentEl.style.lineHeight = String(config.lineHeight);
        contentEl.style.fontFamily = 'inherit';
        contentEl.textContent = chapter.content;
        chapterDiv.appendChild(contentEl);

        container.appendChild(chapterDiv);
      });

      document.body.appendChild(container);

      try {
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageHeight = 297;
        let position = 0;

        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);

        let remainingHeight = imgHeight - pageHeight;
        while (remainingHeight > 0) {
          position -= pageHeight;
          doc.addPage();
          doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          remainingHeight -= pageHeight;
        }

        doc.save(`${config.title || '小说'}.pdf`);
      } finally {
        document.body.removeChild(container);
        set({ isLoading: false });
      }
    },

    createChapter: async (projectId: string, title: string, parentId?: string): Promise<Chapter> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const state = get();
      const projectChapters = state.chapters.filter(c => c.projectId === projectId);
      const newChapter: Chapter = {
        id: `chapter-${Date.now()}`,
        projectId,
        parentId,
        title,
        content: '',
        order: projectChapters.length + 1,
        wordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set(s => {
        const newState = {
          chapters: [...s.chapters, newChapter],
        };
        saveToStorage(newState);
        return newState;
      });

      return newChapter;
    },

    updateChapterTitle: (chapterId: string, title: string) => {
      set(s => {
        const newState = {
          chapters: s.chapters.map(c =>
            c.id === chapterId ? { ...c, title, updatedAt: new Date() } : c
          ),
          currentChapter: s.currentChapter?.id === chapterId
            ? { ...s.currentChapter, title, updatedAt: new Date() }
            : s.currentChapter,
        };
        saveToStorage(newState);
        return newState;
      });
    },

    createProject: async (title: string, description: string): Promise<Project> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const state = get();
      const newProject: Project = {
        id: `project-${Date.now()}`,
        title,
        description,
        creatorId: state.currentUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [{
          userId: state.currentUser.id,
          user: state.currentUser,
          role: 'creator',
          joinedAt: new Date(),
        }],
      };

      set(s => {
        const newState = {
          projects: [...s.projects, newProject],
        };
        saveToStorage(newState);
        return newState;
      });

      return newProject;
    },

    createCharacter: async (character): Promise<Character> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const now = new Date();
      const allCharacters = get().characters;
      const allChapters = get().chapters;

      const newCharacter: Character = {
        projectId: character.projectId,
        name: character.name,
        avatarUrl: character.avatarUrl,
        description: character.description,
        traits: character.traits,
        relationships: (character.relationships || []).map(r => buildRelation(r, allCharacters)),
        appearances: (character.appearances || []).map(a => buildAppearance(a, allChapters)),
        id: `char-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      set(s => {
        const newState = {
          characters: [...s.characters, newCharacter],
        };
        saveToStorage(newState);
        return newState;
      });

      return newCharacter;
    },

    updateCharacter: (characterId: string, updates: Partial<Character>) => {
      set(s => {
        const newState = {
          characters: s.characters.map(c =>
            c.id === characterId
              ? { ...c, ...updates, updatedAt: new Date() }
              : c
          ),
        };
        saveToStorage(newState);
        return newState;
      });
    },

    createPlotPoint: async (plotPoint): Promise<PlotPoint> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const allChapters = get().chapters;

      const newPlotPoint: PlotPoint = {
        projectId: plotPoint.projectId,
        title: plotPoint.title,
        description: plotPoint.description,
        type: plotPoint.type,
        status: plotPoint.status,
        relatedChapterIds: plotPoint.relatedChapterIds,
        relatedCharacterIds: plotPoint.relatedCharacterIds,
        hints: (plotPoint.hints || []).map(h => buildHint(h, allChapters)),
        id: `plot-${Date.now()}`,
        createdAt: new Date(),
      };

      set(s => {
        const newState = {
          plotPoints: [...s.plotPoints, newPlotPoint],
        };
        saveToStorage(newState);
        return newState;
      });

      return newPlotPoint;
    },

    updatePlotPoint: (plotPointId: string, updates: Partial<PlotPoint>) => {
      set(s => {
        const newState = {
          plotPoints: s.plotPoints.map(p =>
            p.id === plotPointId
              ? { ...p, ...updates }
              : p
          ),
        };
        saveToStorage(newState);
        return newState;
      });
    },

    addPlotHint: (plotPointId: string, hint) => {
      const allChapters = get().chapters;
      set(s => {
        const newState = {
          plotPoints: s.plotPoints.map(p =>
            p.id === plotPointId
              ? {
                  ...p,
                  hints: [
                    ...p.hints,
                    buildHint({
                      ...hint,
                      id: `hint-${Date.now()}`,
                      createdAt: new Date(),
                    }, allChapters),
                  ],
                }
              : p
          ),
        };
        saveToStorage(newState);
        return newState;
      });
    },

    checkExpiredLocks: () => {
      const now = new Date();
      set(s => {
        const newState = {
          chapters: s.chapters.map(c => {
            if (c.lock && new Date(c.lock.expiresAt) <= now) {
              return { ...c, lock: undefined };
            }
            return c;
          }),
          currentChapter: s.currentChapter?.lock && new Date(s.currentChapter.lock.expiresAt) <= now
            ? { ...s.currentChapter, lock: undefined }
            : s.currentChapter,
        };
        saveToStorage(newState);
        return newState;
      });
    },

    autoSaveWithVersion: async (chapterId: string, content: string) => {
      const state = get();
      const chapter = state.chapters.find(c => c.id === chapterId);
      if (!chapter) return;

      if (chapter.content === content) return;

      await state.updateChapterContent(chapterId, content);
      await state.createVersion(chapterId, `自动保存：${new Date().toLocaleString()}`);
    },
  };

  return store;
});
