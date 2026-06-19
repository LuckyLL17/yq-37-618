import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  createProject: (input: { title: string; description: string; coverImage?: string }) => Promise<Project>;
  updateChapterContent: (chapterId: string, content: string) => Promise<void>;
  lockChapter: (chapterId: string) => Promise<boolean>;
  unlockChapter: (chapterId: string) => Promise<void>;
  releaseExpiredLocks: () => void;
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

const reviveDates = <T,>(value: T, keys: string[]): T => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(v => reviveDates(v, keys)) as unknown as T;
  }
  const result: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const k of Object.keys(result)) {
    const v = result[k];
    if (keys.includes(k) && typeof v === 'string') {
      const d = new Date(v);
      if (!isNaN(d.getTime())) result[k] = d;
    } else if (v && typeof v === 'object') {
      result[k] = reviveDates(v, keys);
    }
  }
  return result as T;
};

const DATE_KEYS = [
  'createdAt',
  'updatedAt',
  'joinedAt',
  'lockedAt',
  'expiresAt',
  'resolvedAt',
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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

  createProject: async ({ title, description, coverImage }): Promise<Project> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = get();
    const now = new Date();
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      coverImage,
      creatorId: state.currentUser.id,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          userId: state.currentUser.id,
          user: state.currentUser,
          role: 'creator',
          joinedAt: now,
        },
      ],
    };

    set(state => ({
      projects: [...state.projects, newProject],
    }));

    return newProject;
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
    get().releaseExpiredLocks();
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);

    if (
      chapter?.lock &&
      chapter.lock.userId !== state.currentUser.id &&
      new Date(chapter.lock.expiresAt).getTime() > Date.now()
    ) {
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

  releaseExpiredLocks: () => {
    const now = Date.now();
    set(state => {
      let changed = false;
      const chapters = state.chapters.map(c => {
        if (c.lock && new Date(c.lock.expiresAt).getTime() <= now) {
          changed = true;
          return { ...c, lock: undefined };
        }
        return c;
      });
      if (!changed) return {};
      const currentChapter =
        state.currentChapter &&
        state.currentChapter.lock &&
        new Date(state.currentChapter.lock.expiresAt).getTime() <= now
          ? { ...state.currentChapter, lock: undefined }
          : state.currentChapter;
      return { chapters, currentChapter };
    });
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
    const normalizedContent = content.replace(/\s+/g, '');

    const extractKeywords = (text: string): string[] => {
      if (!text) return [];
      const cleaned = text.replace(/[，。！？、；：""''（）【】《》,.!?;:()\[\]<>"'\s]/g, ' ');
      const tokens = cleaned
        .split(/\s+/)
        .filter(Boolean)
        .filter(t => t.length >= 2);
      const ngrams = new Set<string>();
      tokens.forEach(token => {
        if (token.length <= 6) {
          ngrams.add(token);
        } else {
          for (let i = 0; i <= token.length - 3; i++) {
            ngrams.add(token.slice(i, i + 3));
          }
        }
      });
      return Array.from(ngrams);
    };

    const findLineNumber = (needles: string[]): number | undefined => {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (needles.some(n => n && line.includes(n))) {
          return i + 1;
        }
      }
      return undefined;
    };

    const pushWarning = (w: Omit<ConflictWarning, 'id' | 'createdAt' | 'resolved'>) => {
      warnings.push({
        ...w,
        id: `conflict-${chapterId}-${w.plotPointId ?? ''}-${w.severity}-${warnings.length}`,
        createdAt: new Date(),
        resolved: false,
      });
    };

    state.plotPoints.forEach(plotPoint => {
      if (plotPoint.projectId !== chapter.projectId) return;

      const isRelatedChapter = plotPoint.relatedChapterIds.includes(chapterId);
      const hintsForChapter = plotPoint.hints.filter(h => h.chapterId === chapterId);

      hintsForChapter.forEach(hint => {
        const hintText = hint.hintText || '';
        const literalMatch = hintText && normalizedContent.includes(hintText.replace(/\s+/g, ''));
        const keywords = extractKeywords(hintText);
        const matchedKeywords = keywords.filter(k => normalizedContent.includes(k));
        const matchRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;

        if (literalMatch) {
          pushWarning({
            chapterId,
            plotPointId: plotPoint.id,
            plotPoint,
            severity: 'info',
            message: `检测到伏笔"${plotPoint.title}"的原始线索：${hintText}。请确保与后续情节保持一致。`,
            lineNumber: findLineNumber([hintText.slice(0, 20)]),
          });
        } else if (matchRatio >= 0.4 && matchedKeywords.length >= 2) {
          pushWarning({
            chapterId,
            plotPointId: plotPoint.id,
            plotPoint,
            severity: 'warning',
            message: `伏笔"${plotPoint.title}"的线索描述疑似被改写（关键词匹配 ${Math.round(matchRatio * 100)}%）。原文："${hintText}"，请确认改动是否破坏了后续回收逻辑。`,
            lineNumber: findLineNumber(matchedKeywords),
          });
        } else if (hintText) {
          pushWarning({
            chapterId,
            plotPointId: plotPoint.id,
            plotPoint,
            severity: 'error',
            message: `伏笔"${plotPoint.title}"在本章应埋设线索："${hintText}"，但当前内容中已找不到对应描述（关键词匹配 ${Math.round(matchRatio * 100)}%）。修改可能导致伏笔丢失。`,
          });
        }
      });

      if (
        isRelatedChapter &&
        plotPoint.status !== 'resolved' &&
        hintsForChapter.length === 0
      ) {
        const titleKeywords = extractKeywords(plotPoint.title);
        const descKeywords = extractKeywords(plotPoint.description);
        const allKeywords = Array.from(new Set([...titleKeywords, ...descKeywords]));
        const matched = allKeywords.filter(k => normalizedContent.includes(k));
        const ratio = allKeywords.length > 0 ? matched.length / allKeywords.length : 0;

        if (ratio < 0.2) {
          pushWarning({
            chapterId,
            plotPointId: plotPoint.id,
            plotPoint,
            severity: 'warning',
            message: `本章被关联到伏笔"${plotPoint.title}"，但内容中几乎没有体现相关描述（相关度 ${Math.round(ratio * 100)}%）。请检查是否需要补写或解除关联。`,
          });
        } else if (plotPoint.status === 'pending') {
          pushWarning({
            chapterId,
            plotPointId: plotPoint.id,
            plotPoint,
            severity: 'info',
            message: `本章关联了伏笔"${plotPoint.title}"，且该伏笔尚未回收。如本章已推动其进展，请更新伏笔状态。`,
          });
        }
      }
    });

    set(state => {
      const others = state.conflictWarnings.filter(c => c.chapterId !== chapterId);
      const previousResolved = state.conflictWarnings.filter(
        c => c.chapterId === chapterId && c.resolved
      );
      const previousResolvedKeys = new Set(
        previousResolved.map(c => `${c.plotPointId ?? ''}|${c.severity}|${c.message}`)
      );
      const merged = warnings.map(w => {
        const key = `${w.plotPointId ?? ''}|${w.severity}|${w.message}`;
        if (previousResolvedKeys.has(key)) {
          const prev = previousResolved.find(
            p => `${p.plotPointId ?? ''}|${p.severity}|${p.message}` === key
          );
          return prev ? { ...w, id: prev.id, resolved: true, resolvedAt: prev.resolvedAt } : w;
        }
        return w;
      });
      return { conflictWarnings: [...others, ...merged] };
    });

    return get().conflictWarnings.filter(c => c.chapterId === chapterId);
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
    const html2canvas = (await import('html2canvas')).default;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = config.margin;
    const contentWidthMm = pageWidth - margin.left - margin.right;
    const contentHeightMm = pageHeight - margin.top - margin.bottom;

    const renderHtmlToCanvas = async (html: string, widthMm: number) => {
      const widthPx = Math.round(widthMm * 3.78);
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.width = `${widthPx}px`;
      container.style.padding = '0';
      container.style.background = '#ffffff';
      container.style.fontFamily = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "SimSun", serif';
      container.style.color = '#1a1a1a';
      container.style.fontSize = `${config.fontSize}pt`;
      container.style.lineHeight = String(config.lineHeight);
      container.style.whiteSpace = 'pre-wrap';
      container.style.wordBreak = 'break-word';
      container.innerHTML = html;
      document.body.appendChild(container);
      try {
        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
        });
        return canvas;
      } finally {
        document.body.removeChild(container);
      }
    };

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    let pageNum = 1;
    let isFirstPage = true;

    const addNewPageIfNeeded = () => {
      if (!isFirstPage) {
        doc.addPage();
        pageNum++;
      }
      isFirstPage = false;
    };

    const drawPageNumber = () => {
      if (config.includePageNumbers) {
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`- ${pageNum} -`, pageWidth / 2, pageHeight - margin.bottom / 2, { align: 'center' });
      }
    };

    if (config.includeCover) {
      addNewPageIfNeeded();
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      const coverHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:${Math.round(contentHeightMm * 3.78)}px;color:#ffffff;text-align:center;">
          <div style="font-size:36pt;font-weight:700;margin-bottom:24px;">${escapeHtml(config.title)}</div>
          ${config.author ? `<div style="font-size:14pt;color:#d4af37;">${escapeHtml(config.author)}</div>` : ''}
        </div>
      `;
      const coverCanvas = await renderHtmlToCanvas(coverHtml, contentWidthMm);
      const ratio = coverCanvas.height / coverCanvas.width;
      const imgHeightMm = contentWidthMm * ratio;
      doc.addImage(
        coverCanvas.toDataURL('image/png'),
        'PNG',
        margin.left,
        margin.top,
        contentWidthMm,
        Math.min(imgHeightMm, contentHeightMm)
      );
    }

    if (config.includeToc) {
      addNewPageIfNeeded();
      const tocItems = config.chapterIds
        .map((chapterId, index) => {
          const chapter = get().chapters.find(c => c.id === chapterId);
          return chapter
            ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ccc;">
                 <span>${index + 1}. ${escapeHtml(chapter.title)}</span>
                 <span>${index + 2}</span>
               </div>`
            : '';
        })
        .join('');

      const tocHtml = `
        <div style="color:#1a1a1a;">
          <div style="font-size:20pt;font-weight:700;color:#1e3a5f;margin-bottom:20px;">目录</div>
          <div style="font-size:${config.fontSize}pt;">${tocItems}</div>
        </div>
      `;
      const tocCanvas = await renderHtmlToCanvas(tocHtml, contentWidthMm);
      const ratio = tocCanvas.height / tocCanvas.width;
      const imgHeightMm = contentWidthMm * ratio;
      doc.addImage(
        tocCanvas.toDataURL('image/png'),
        'PNG',
        margin.left,
        margin.top,
        contentWidthMm,
        Math.min(imgHeightMm, contentHeightMm)
      );
      drawPageNumber();
    }

    for (const chapterId of config.chapterIds) {
      const chapter = get().chapters.find(c => c.id === chapterId);
      if (!chapter) continue;

      const paragraphs = chapter.content
        .split(/\n+/)
        .map(p => `<p style="margin:0 0 12px 0;text-indent:2em;">${escapeHtml(p)}</p>`)
        .join('');

      const chapterHtml = `
        <div style="color:#1a1a1a;">
          <div style="font-size:18pt;font-weight:700;color:#1e3a5f;margin-bottom:8px;">${escapeHtml(chapter.title)}</div>
          <div style="height:2px;width:60px;background:#d4af37;margin-bottom:16px;"></div>
          <div style="font-size:${config.fontSize}pt;line-height:${config.lineHeight};">${paragraphs}</div>
        </div>
      `;

      const canvas = await renderHtmlToCanvas(chapterHtml, contentWidthMm);
      const ratio = canvas.height / canvas.width;
      const totalHeightMm = contentWidthMm * ratio;

      let renderedHeightMm = 0;
      while (renderedHeightMm < totalHeightMm) {
        addNewPageIfNeeded();
        const remainingMm = totalHeightMm - renderedHeightMm;
        const sliceHeightMm = Math.min(contentHeightMm, remainingMm);

        const sliceCanvas = document.createElement('canvas');
        const scale = canvas.width / contentWidthMm;
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.round(sliceHeightMm * scale);
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            Math.round(renderedHeightMm * scale),
            canvas.width,
            sliceCanvas.height,
            0,
            0,
            canvas.width,
            sliceCanvas.height
          );
        }
        doc.addImage(
          sliceCanvas.toDataURL('image/png'),
          'PNG',
          margin.left,
          margin.top,
          contentWidthMm,
          sliceHeightMm
        );
        drawPageNumber();
        renderedHeightMm += sliceHeightMm;
      }
    }

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
      relationships: character.relationships ?? [],
      appearances: character.appearances ?? [],
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
    }),
    {
      name: 'moyun-app-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        chapters: state.chapters,
        chapterVersions: state.chapterVersions,
        characters: state.characters,
        plotPoints: state.plotPoints,
        conflictWarnings: state.conflictWarnings,
        users: state.users,
        currentUser: state.currentUser,
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        const revived = reviveDates(persistedState as Record<string, unknown>, DATE_KEYS);
        return { ...currentState, ...revived } as AppState;
      },
    }
  )
);
