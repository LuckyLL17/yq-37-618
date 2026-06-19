import { create } from 'zustand';
import type {
  User,
  Project,
  Chapter,
  ChapterVersion,
  Character,
  PlotPoint,
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
  addPlotHint: (plotPointId: string, hint: Omit<PlotPoint['hints'][0], 'id' | 'createdAt'>) => void;
  checkExpiredLocks: () => void;
  autoSaveWithVersion: (chapterId: string, content: string) => Promise<void>;
}

const dmp = new diff_match_patch();

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: mockCurrentUser,
  users: mockUsers,
  projects: mockProjects,
  currentProject: null,
  chapters: mockChapters,
  currentChapter: null,
  chapterVersions: mockChapterVersions,
  characters: mockCharacters,
  plotPoints: mockPlotPoints,
  conflictWarnings: mockConflictWarnings,
  isLoading: false,

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
    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === chapterId
          ? { ...c, content, wordCount, updatedAt: new Date() }
          : c
      ),
      currentChapter: state.currentChapter?.id === chapterId
        ? { ...state.currentChapter, content, wordCount, updatedAt: new Date() }
        : state.currentChapter,
      isLoading: false,
    }));
  },

  lockChapter: async (chapterId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);
    
    if (chapter?.lock && chapter.lock.userId !== state.currentUser.id) {
      return false;
    }

    const lock = {
      userId: state.currentUser.id,
      user: state.currentUser,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };

    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === chapterId ? { ...c, lock } : c
      ),
      currentChapter: state.currentChapter?.id === chapterId
        ? { ...state.currentChapter, lock }
        : state.currentChapter,
    }));

    return true;
  },

  unlockChapter: async (chapterId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === chapterId ? { ...c, lock: undefined } : c
      ),
      currentChapter: state.currentChapter?.id === chapterId
        ? { ...state.currentChapter, lock: undefined }
        : state.currentChapter,
    }));
  },

  createVersion: async (chapterId: string, summary: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const newVersion: ChapterVersion = {
      id: `version-${Date.now()}`,
      chapterId,
      content: chapter.content,
      authorId: state.currentUser.id,
      author: state.currentUser,
      changeSummary: summary,
      createdAt: new Date(),
    };

    set(state => ({
      chapterVersions: [...state.chapterVersions, newVersion],
    }));
  },

  revertToVersion: async (versionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = get();
    const version = state.chapterVersions.find(v => v.id === versionId);
    if (!version) return;

    const wordCount = version.content.replace(/\s/g, '').length;

    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === version.chapterId
          ? { ...c, content: version.content, wordCount, updatedAt: new Date() }
          : c
      ),
      currentChapter: state.currentChapter?.id === version.chapterId
        ? { ...state.currentChapter, content: version.content, wordCount, updatedAt: new Date() }
        : state.currentChapter,
    }));

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

    set(state => ({
      conflictWarnings: [
        ...state.conflictWarnings.filter(c => c.chapterId !== chapterId || c.resolved),
        ...warnings,
      ],
    }));

    return warnings;
  },

  resolveConflict: (conflictId: string) => {
    set(state => ({
      conflictWarnings: state.conflictWarnings.map(c =>
        c.id === conflictId
          ? { ...c, resolved: true, resolvedAt: new Date() }
          : c
      ),
    }));
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

    set(state => ({
      chapters: [...state.chapters, newChapter],
    }));

    return newChapter;
  },

  updateChapterTitle: (chapterId: string, title: string) => {
    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === chapterId ? { ...c, title, updatedAt: new Date() } : c
      ),
      currentChapter: state.currentChapter?.id === chapterId
        ? { ...state.currentChapter, title, updatedAt: new Date() }
        : state.currentChapter,
    }));
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

    set(state => ({
      projects: [...state.projects, newProject],
    }));

    return newProject;
  },

  createCharacter: async (character): Promise<Character> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const now = new Date();
    const newCharacter: Character = {
      projectId: character.projectId,
      name: character.name,
      avatarUrl: character.avatarUrl,
      description: character.description,
      traits: character.traits,
      relationships: character.relationships || [],
      appearances: character.appearances || [],
      id: `char-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    set(state => ({
      characters: [...state.characters, newCharacter],
    }));

    return newCharacter;
  },

  updateCharacter: (characterId: string, updates: Partial<Character>) => {
    set(state => ({
      characters: state.characters.map(c =>
        c.id === characterId
          ? { ...c, ...updates, updatedAt: new Date() }
          : c
      ),
    }));
  },

  createPlotPoint: async (plotPoint): Promise<PlotPoint> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newPlotPoint: PlotPoint = {
      projectId: plotPoint.projectId,
      title: plotPoint.title,
      description: plotPoint.description,
      type: plotPoint.type,
      status: plotPoint.status,
      relatedChapterIds: plotPoint.relatedChapterIds,
      relatedCharacterIds: plotPoint.relatedCharacterIds,
      hints: plotPoint.hints || [],
      id: `plot-${Date.now()}`,
      createdAt: new Date(),
    };

    set(state => ({
      plotPoints: [...state.plotPoints, newPlotPoint],
    }));

    return newPlotPoint;
  },

  updatePlotPoint: (plotPointId: string, updates: Partial<PlotPoint>) => {
    set(state => ({
      plotPoints: state.plotPoints.map(p =>
        p.id === plotPointId
          ? { ...p, ...updates }
          : p
      ),
    }));
  },

  addPlotHint: (plotPointId: string, hint) => {
    set(state => ({
      plotPoints: state.plotPoints.map(p =>
        p.id === plotPointId
          ? {
              ...p,
              hints: [
                ...p.hints,
                {
                  ...hint,
                  id: `hint-${Date.now()}`,
                  createdAt: new Date(),
                },
              ],
            }
          : p
      ),
    }));
  },

  checkExpiredLocks: () => {
    const now = new Date();
    set(state => ({
      chapters: state.chapters.map(c => {
        if (c.lock && new Date(c.lock.expiresAt) <= now) {
          return { ...c, lock: undefined };
        }
        return c;
      }),
      currentChapter: state.currentChapter?.lock && new Date(state.currentChapter.lock.expiresAt) <= now
        ? { ...state.currentChapter, lock: undefined }
        : state.currentChapter,
    }));
  },

  autoSaveWithVersion: async (chapterId: string, content: string) => {
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    await state.updateChapterContent(chapterId, content);

    const versions = state.getChapterVersions(chapterId);
    const lastAutoVersion = versions.find(v => v.changeSummary.startsWith('自动保存：'));
    const shouldCreateVersion = !lastAutoVersion ||
      (new Date().getTime() - new Date(lastAutoVersion.createdAt).getTime() > 5 * 60 * 1000);

    if (shouldCreateVersion) {
      await state.createVersion(chapterId, `自动保存：${new Date().toLocaleString()}`);
    }
  },
}));
