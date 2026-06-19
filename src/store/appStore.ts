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
  createChapter: (projectId: string, title: string, parentId?: string) => Promise<Chapter>;
  updateChapterTitle: (chapterId: string, title: string) => void;
  createCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Character>;
  updateCharacter: (characterId: string, updates: Partial<Character>) => void;
  createPlotPoint: (plotPoint: Omit<PlotPoint, 'id' | 'createdAt'>) => Promise<PlotPoint>;
  updatePlotPoint: (plotPointId: string, updates: Partial<PlotPoint>) => void;
  addPlotHint: (plotPointId: string, hint: Omit<PlotPoint['hints'][0], 'id' | 'createdAt'>) => void;
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

    state.plotPoints.forEach(plotPoint => {
      if (plotPoint.status === 'resolved') return;

      const relatedHints = plotPoint.hints.filter(h => h.chapterId === chapterId);
      const isRelatedChapter = plotPoint.relatedChapterIds.includes(chapterId);

      if (relatedHints.length > 0 || isRelatedChapter) {
        plotPoint.hints.forEach(hint => {
          if (hint.chapterId === chapterId && chapter.content.includes(hint.hintText)) {
            const lines = chapter.content.split('\n');
            let lineNumber = -1;
            lines.forEach((line, idx) => {
              if (line.includes(hint.hintText.slice(0, 20))) {
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
        });

        if (plotPoint.status === 'pending' && isRelatedChapter) {
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
    });

    const existingIds = get().conflictWarnings.filter(c => c.chapterId === chapterId).map(c => c.id);
    const newWarnings = warnings.filter(w => !existingIds.includes(w.id));

    if (newWarnings.length > 0) {
      set(state => ({
        conflictWarnings: [...state.conflictWarnings, ...newWarnings],
      }));
    }

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
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = config.margin;
    const contentWidth = pageWidth - margin.left - margin.right;

    let y = margin.top;

    if (config.includeCover) {
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(config.title, contentWidth);
      titleLines.forEach((line: string, i: number) => {
        doc.text(line, pageWidth / 2, pageHeight / 2 - 20 + i * 14, { align: 'center' });
      });

      if (config.author) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(212, 175, 55);
        doc.text(config.author, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
      }

      doc.addPage();
      y = margin.top;
    }

    if (config.includeToc) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('目录', margin.left, y);
      y += 15;

      doc.setFontSize(config.fontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      let tocY = y;
      config.chapterIds.forEach((chapterId, index) => {
        const chapter = get().chapters.find(c => c.id === chapterId);
        if (chapter) {
          doc.text(`${index + 1}. ${chapter.title}`, margin.left, tocY);
          doc.text(`... ${index + 2}`, pageWidth - margin.right, tocY, { align: 'right' });
          tocY += 8;
          if (tocY > pageHeight - margin.bottom) {
            doc.addPage();
            tocY = margin.top;
          }
        }
      });

      doc.addPage();
      y = margin.top;
    }

    let pageNum = config.includeCover ? 2 : 1;
    if (config.includeToc) pageNum++;

    config.chapterIds.forEach((chapterId, chapIdx) => {
      const chapter = get().chapters.find(c => c.id === chapterId);
      if (!chapter) return;

      if (chapIdx > 0 || config.includeToc || config.includeCover) {
        if (y > margin.top) {
          doc.addPage();
          pageNum++;
          y = margin.top;
        }
      }

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text(chapter.title, margin.left, y);
      y += 12;

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(margin.left, y, margin.left + 40, y);
      y += 8;

      doc.setFontSize(config.fontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setLineHeightFactor(config.lineHeight);

      const lines = doc.splitTextToSize(chapter.content, contentWidth);
      lines.forEach((line: string) => {
        if (y > pageHeight - margin.bottom - 10) {
          if (config.includePageNumbers) {
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text(`- ${pageNum} -`, pageWidth / 2, pageHeight - margin.bottom / 2, { align: 'center' });
          }
          doc.addPage();
          pageNum++;
          y = margin.top;
          doc.setFontSize(config.fontSize);
          doc.setTextColor(0, 0, 0);
        }
        doc.text(line, margin.left, y);
        y += config.fontSize * config.lineHeight * 0.35;
      });

      if (config.includePageNumbers) {
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`- ${pageNum} -`, pageWidth / 2, pageHeight - margin.bottom / 2, { align: 'center' });
      }
    });

    doc.save(`${config.title || '小说'}.pdf`);
    set({ isLoading: false });
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

  createCharacter: async (character): Promise<Character> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newCharacter: Character = {
      ...character,
      id: `char-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      relationships: [],
      appearances: [],
    } as Character;

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
      ...plotPoint,
      id: `plot-${Date.now()}`,
      createdAt: new Date(),
      hints: [],
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
}));
