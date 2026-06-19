import { create } from 'zustand';
import type {
  User,
  Project,
  Chapter,
  ChapterVersion,
  Character,
  CharacterRelation,
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
import html2canvas from 'html2canvas';

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
  updateChapterContent: (chapterId: string, content: string, autoSave?: boolean) => Promise<void>;
  lockChapter: (chapterId: string) => Promise<boolean>;
  unlockChapter: (chapterId: string) => Promise<void>;
  checkExpiredLocks: () => void;
  createVersion: (chapterId: string, summary: string) => Promise<void>;
  revertToVersion: (versionId: string) => Promise<void>;
  getDiff: (oldContent: string, newContent: string) => Diff[];
  getChapterVersions: (chapterId: string) => ChapterVersion[];
  getCharactersForChapter: (chapterId: string) => Character[];
  getPlotPointsForChapter: (chapterId: string) => PlotPoint[];
  checkConflicts: (chapterId: string) => Promise<ConflictWarning[]>;
  resolveConflict: (conflictId: string) => void;
  exportToPdf: (config: PdfExportConfig) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'members' | 'creatorId'>) => Promise<Project>;
  createChapter: (projectId: string, title: string, parentId?: string) => Promise<Chapter>;
  updateChapterTitle: (chapterId: string, title: string) => void;
  createCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'relationships' | 'appearances'> & {
    relationships?: CharacterRelation[];
    appearances?: any[];
  }) => Promise<Character>;
  updateCharacter: (characterId: string, updates: Partial<Character>) => void;
  createPlotPoint: (plotPoint: Omit<PlotPoint, 'id' | 'createdAt' | 'hints'>) => Promise<PlotPoint>;
  updatePlotPoint: (plotPointId: string, updates: Partial<PlotPoint>) => void;
  addPlotHint: (plotPointId: string, hint: Omit<PlotPoint['hints'][0], 'id' | 'createdAt'>) => void;
}

const dmp = new diff_match_patch();

let lockCheckInterval: NodeJS.Timeout | null = null;

const STORAGE_KEY = 'ink-rhythm-app-state';

const reviveDates = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(reviveDates) as unknown as T;
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      const value = (obj as any)[key];
      if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          result[key] = date;
          continue;
        }
      }
      result[key] = reviveDates(value);
    }
    return result;
  }
  return obj;
};

const loadPersistedState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return reviveDates(parsed);
    }
  } catch (e) {
    console.warn('Failed to load persisted state:', e);
  }
  return null;
};

const persisted = loadPersistedState();

const initialState = {
  currentUser: mockCurrentUser,
  users: mockUsers,
  projects: mockProjects,
  currentProject: null as Project | null,
  chapters: mockChapters,
  currentChapter: null as Chapter | null,
  chapterVersions: mockChapterVersions,
  characters: mockCharacters,
  plotPoints: mockPlotPoints,
  conflictWarnings: mockConflictWarnings,
  isLoading: false,
};

const mergedInitialState = persisted
  ? {
      ...initialState,
      projects: persisted.projects || initialState.projects,
      chapters: persisted.chapters || initialState.chapters,
      chapterVersions: persisted.chapterVersions || initialState.chapterVersions,
      characters: persisted.characters || initialState.characters,
      plotPoints: persisted.plotPoints || initialState.plotPoints,
      conflictWarnings: persisted.conflictWarnings || initialState.conflictWarnings,
      currentProject: null,
      currentChapter: null,
    }
  : initialState;

const persistMiddleware = (config: any) => (set: any, get: any, api: any) => {
  const savedSet = (partial: any, replace?: any) => {
    set(partial, replace);
    const state = get();
    const toPersist = {
      projects: state.projects,
      chapters: state.chapters,
      chapterVersions: state.chapterVersions,
      characters: state.characters,
      plotPoints: state.plotPoints,
      conflictWarnings: state.conflictWarnings,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch (e) {
      console.warn('Failed to persist state:', e);
    }
  };
  return config(savedSet, get, api);
};

export const useAppStore = create<AppState>()(persistMiddleware((set, get) => ({
  ...mergedInitialState,

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

  checkExpiredLocks: () => {
    const now = new Date();
    set(state => {
      let hasChanges = false;
      const updatedChapters = state.chapters.map(c => {
        if (c.lock && new Date(c.lock.expiresAt) <= now) {
          hasChanges = true;
          return { ...c, lock: undefined };
        }
        return c;
      });
      const updatedCurrentChapter = state.currentChapter?.lock && new Date(state.currentChapter.lock.expiresAt) <= now
        ? { ...state.currentChapter, lock: undefined }
        : state.currentChapter;
      return hasChanges ? { chapters: updatedChapters, currentChapter: updatedCurrentChapter } : state;
    });
  },

  updateChapterContent: async (chapterId: string, content: string, autoSave = false) => {
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

    if (autoSave) {
      await get().createVersion(chapterId, '自动保存');
    }
  },

  lockChapter: async (chapterId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);
    
    if (chapter?.lock && chapter.lock.userId !== state.currentUser.id) {
      const now = new Date();
      if (new Date(chapter.lock.expiresAt) > now) {
        return false;
      }
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

    if (!lockCheckInterval) {
      lockCheckInterval = setInterval(() => {
        get().checkExpiredLocks();
      }, 10000);
    }

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
    await new Promise(resolve => setTimeout(resolve, 100));
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const versions = state.chapterVersions.filter(v => v.chapterId === chapterId);
    const latestVersion = versions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    if (latestVersion && latestVersion.content === chapter.content) {
      return;
    }

    const newVersion: ChapterVersion = {
      id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);
    if (!chapter) return [];

    const warnings: ConflictWarning[] = [];

    state.plotPoints.forEach(plotPoint => {
      if (plotPoint.status === 'resolved') return;

      const relatedHints = plotPoint.hints.filter(h => h.chapterId === chapterId);
      const isRelatedChapter = plotPoint.relatedChapterIds.includes(chapterId);

      if (relatedHints.length > 0 || isRelatedChapter) {
        plotPoint.hints.forEach(hint => {
          if (hint.chapterId === chapterId) {
            const hintTextLower = hint.hintText.toLowerCase().trim();
            const contentLower = chapter.content.toLowerCase();
            
            let matchFound = false;
            let lineNumber = -1;
            
            if (hintTextLower.length > 0) {
              const searchTerms = [
                hintTextLower,
                hintTextLower.slice(0, Math.floor(hintTextLower.length * 0.8)),
                hintTextLower.slice(0, Math.floor(hintTextLower.length * 0.6)),
              ];
              
              const lines = chapter.content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const lineLower = lines[i].toLowerCase();
                for (const term of searchTerms) {
                  if (term.length >= 3 && lineLower.includes(term)) {
                    matchFound = true;
                    lineNumber = i + 1;
                    break;
                  }
                }
                if (matchFound) break;
              }
              
              if (!matchFound && contentLower.includes(searchTerms[1])) {
                matchFound = true;
              }
            }

            if (matchFound) {
              warnings.push({
                id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
          warnings.push({
            id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
    });

    state.characters.forEach(character => {
      const appearsInChapter = character.appearances.some(a => a.chapterId === chapterId);
      if (appearsInChapter) {
        const charName = character.name.toLowerCase();
        const contentLower = chapter.content.toLowerCase();
        
        if (charName.length >= 2 && !contentLower.includes(charName)) {
          warnings.push({
            id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            chapterId,
            characterId: character.id,
            character,
            severity: 'warning',
            message: `人物"${character.name}"被标记为在本章出场，但章节内容中未提及该人物。请确认人物出场标记是否正确。`,
            createdAt: new Date(),
            resolved: false,
          });
        }
      }
    });

    const chapterWarnings = state.conflictWarnings.filter(c => c.chapterId === chapterId);
    const existingResolved = chapterWarnings.filter(c => c.resolved);
    const newWarningsFiltered = warnings.filter(w => {
      const duplicate = chapterWarnings.find(
        existing => 
          !existing.resolved && 
          existing.plotPointId === w.plotPointId && 
          existing.message === w.message &&
          existing.characterId === w.characterId
      );
      return !duplicate;
    });

    set(state => ({
      conflictWarnings: [
        ...state.conflictWarnings.filter(c => c.chapterId !== chapterId || c.resolved),
        ...existingResolved,
        ...newWarningsFiltered,
      ],
    }));

    return [...get().conflictWarnings.filter(c => c.chapterId === chapterId)];
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
    await new Promise(resolve => setTimeout(resolve, 300));

    const { jsPDF } = await import('jspdf');

    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 210mm;
      background: white;
      padding: ${config.margin.top}mm ${config.margin.right}mm ${config.margin.bottom}mm ${config.margin.left}mm;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      color: #1a1a2e;
      font-size: ${config.fontSize}pt;
      line-height: ${config.lineHeight};
    `;

    if (config.includeCover) {
      const cover = document.createElement('div');
      cover.style.cssText = `
        page-break-after: always;
        height: 297mm;
        margin: -${config.margin.top}mm -${config.margin.right}mm -${config.margin.bottom}mm -${config.margin.left}mm;
        background: linear-gradient(135deg, #1e3a5f 0%, #16213e 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        text-align: center;
        padding: 20mm;
      `;
      
      const titleEl = document.createElement('h1');
      titleEl.textContent = config.title;
      titleEl.style.cssText = 'font-size: 36pt; font-weight: bold; margin: 0 0 20mm 0;';
      cover.appendChild(titleEl);

      if (config.author) {
        const authorEl = document.createElement('p');
        authorEl.textContent = config.author;
        authorEl.style.cssText = 'font-size: 14pt; color: #d4af37; margin: 0;';
        cover.appendChild(authorEl);
      }

      container.appendChild(cover);
    }

    if (config.includeToc) {
      const toc = document.createElement('div');
      toc.style.cssText = 'page-break-after: always;';
      
      const tocTitle = document.createElement('h2');
      tocTitle.textContent = '目录';
      tocTitle.style.cssText = 'font-size: 20pt; font-weight: bold; color: #1e3a5f; margin: 0 0 15mm 0;';
      toc.appendChild(tocTitle);

      config.chapterIds.forEach((chapterId, index) => {
        const chapter = get().chapters.find(c => c.id === chapterId);
        if (chapter) {
          const item = document.createElement('div');
          item.style.cssText = 'margin-bottom: 8mm; font-size: 12pt;';
          item.textContent = `${index + 1}. ${chapter.title}`;
          toc.appendChild(item);
        }
      });

      container.appendChild(toc);
    }

    config.chapterIds.forEach((chapterId) => {
      const chapter = get().chapters.find(c => c.id === chapterId);
      if (!chapter) return;

      const chapterDiv = document.createElement('div');
      chapterDiv.style.cssText = 'page-break-before: always;';

      const chapterTitle = document.createElement('h2');
      chapterTitle.textContent = chapter.title;
      chapterTitle.style.cssText = 'font-size: 18pt; font-weight: bold; color: #1e3a5f; margin: 0 0 8mm 0; padding-bottom: 4mm; border-bottom: 0.5mm solid #d4af37;';
      chapterDiv.appendChild(chapterTitle);

      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'white-space: pre-wrap; word-wrap: break-word;';
      contentDiv.textContent = chapter.content;
      chapterDiv.appendChild(contentDiv);

      container.appendChild(chapterDiv);
    });

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const ratio = pdfWidth / (imgWidth * 0.264583);
    const totalHeightInMm = imgHeight * 0.264583 * ratio;
    
    let heightLeft = totalHeightInMm;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalHeightInMm);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalHeightInMm);
      heightLeft -= pdfHeight;
    }

    if (config.includePageNumbers) {
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`- ${i} -`, pdfWidth / 2, pdfHeight - config.margin.bottom / 2, { align: 'center' });
      }
    }

    pdf.save(`${config.title || '小说'}.pdf`);
    set({ isLoading: false });
  },

  createProject: async (projectData) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = get();
    
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: projectData.title,
      description: projectData.description,
      coverImage: projectData.coverImage,
      creatorId: state.currentUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          userId: state.currentUser.id,
          user: state.currentUser,
          role: 'creator',
          joinedAt: new Date(),
        },
      ],
    };

    set(state => ({
      projects: [...state.projects, newProject],
      isLoading: false,
    }));

    return newProject;
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

  createCharacter: async (characterData) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newCharacter: Character = {
      id: `char-${Date.now()}`,
      projectId: characterData.projectId,
      name: characterData.name,
      avatarUrl: characterData.avatarUrl,
      description: characterData.description,
      traits: characterData.traits || {},
      relationships: Array.isArray(characterData.relationships) ? characterData.relationships : [],
      appearances: Array.isArray(characterData.appearances) ? characterData.appearances : [],
      createdAt: new Date(),
      updatedAt: new Date(),
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

  createPlotPoint: async (plotPointData) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newPlotPoint: PlotPoint = {
      id: `plot-${Date.now()}`,
      projectId: plotPointData.projectId,
      title: plotPointData.title,
      description: plotPointData.description,
      type: plotPointData.type,
      status: plotPointData.status,
      relatedChapterIds: plotPointData.relatedChapterIds || [],
      relatedCharacterIds: plotPointData.relatedCharacterIds || [],
      hints: [],
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
})));
