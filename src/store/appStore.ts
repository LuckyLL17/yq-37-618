import { create } from 'zustand';
import type {
  User,
  Project,
  Chapter,
  ChapterVersion,
  Character,
  CharacterRelation,
  CharacterAppearance,
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
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'members'>) => Promise<Project>;
  updateChapterContent: (chapterId: string, content: string) => Promise<void>;
  lockChapter: (chapterId: string) => Promise<boolean>;
  unlockChapter: (chapterId: string) => Promise<void>;
  releaseExpiredLocks: () => void;
  isLockExpired: (lock: { expiresAt: Date }) => boolean;
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

  createProject: async (projectData): Promise<Project> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const state = get();
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: projectData.title,
      description: projectData.description,
      coverImage: projectData.coverImage,
      creatorId: projectData.creatorId,
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

  updateChapterContent: async (chapterId: string, content: string, createAutoVersion = true) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 300));

    const wordCount = content.replace(/\s/g, '').length;
    const now = new Date();

    const state = get();
    const prevChapter = state.chapters.find(c => c.id === chapterId);

    set(state => ({
      chapters: state.chapters.map(c =>
        c.id === chapterId
          ? { ...c, content, wordCount, updatedAt: now }
          : c
      ),
      currentChapter: state.currentChapter?.id === chapterId
        ? { ...state.currentChapter, content, wordCount, updatedAt: now }
        : state.currentChapter,
      isLoading: false,
    }));

    if (createAutoVersion && prevChapter && prevChapter.content !== content) {
      const prevVersions = state.chapterVersions.filter(v => v.chapterId === chapterId);
      const lastAutoVersion = prevVersions.find(v => v.changeSummary.startsWith('自动保存'));
      
      const shouldCreateVersion = !lastAutoVersion || 
        (now.getTime() - new Date(lastAutoVersion.createdAt).getTime() > 5 * 60 * 1000) ||
        Math.abs(content.length - prevChapter.content.length) > 50;

      if (shouldCreateVersion) {
        const newVersion: ChapterVersion = {
          id: `version-auto-${Date.now()}`,
          chapterId,
          content,
          authorId: state.currentUser.id,
          author: state.currentUser,
          changeSummary: `自动保存 (${now.toLocaleTimeString()})`,
          createdAt: now,
        };
        set(state => ({
          chapterVersions: [...state.chapterVersions, newVersion],
        }));
      }
    }
  },

  lockChapter: async (chapterId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    get().releaseExpiredLocks();
    const state = get();
    const chapter = state.chapters.find(c => c.id === chapterId);
    
    if (chapter?.lock && chapter.lock.userId !== state.currentUser.id && !state.isLockExpired(chapter.lock)) {
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

  isLockExpired: (lock: { expiresAt: Date }): boolean => {
    return new Date(lock.expiresAt).getTime() <= Date.now();
  },

  releaseExpiredLocks: () => {
    const state = get();
    let hasChanges = false;
    const updatedChapters = state.chapters.map(c => {
      if (c.lock && state.isLockExpired(c.lock)) {
        hasChanges = true;
        return { ...c, lock: undefined };
      }
      return c;
    });

    if (hasChanges) {
      set(state => ({
        chapters: updatedChapters,
        currentChapter: state.currentChapter && state.currentChapter.lock && state.isLockExpired(state.currentChapter.lock)
          ? { ...state.currentChapter, lock: undefined }
          : state.currentChapter,
      }));
    }
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

    const extractKeywords = (text: string): string[] => {
      const cleaned = text.replace(/[，。！？、；：""''（）\s,.!?;:"'()]/g, ' ');
      const segments = cleaned.split(/\s+/).filter(s => s.length >= 2);
      const unique = [...new Set(segments)];
      return unique.slice(0, 8);
    };

    const fuzzyMatch = (content: string, keywords: string[], exactPhrase: string): { matched: boolean; matchedText: string } => {
      if (content.includes(exactPhrase)) {
        return { matched: true, matchedText: exactPhrase };
      }
      let matchCount = 0;
      let matchedKeywords: string[] = [];
      for (const kw of keywords) {
        if (content.includes(kw)) {
          matchCount++;
          matchedKeywords.push(kw);
        }
      }
      if (matchCount >= Math.max(2, Math.ceil(keywords.length * 0.4))) {
        return { matched: true, matchedText: matchedKeywords.join('、') };
      }
      return { matched: false, matchedText: '' };
    };

    const findLineNumber = (content: string, searchTerms: string[]): number => {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const term of searchTerms) {
          if (lines[i].includes(term.slice(0, Math.min(term.length, 10)))) {
            return i + 1;
          }
        }
      }
      return -1;
    };

    const warnings: ConflictWarning[] = [];
    const existingWarnings = state.conflictWarnings.filter(c => c.chapterId === chapterId);
    const previouslyResolved = existingWarnings.filter(c => c.resolved);

    state.plotPoints.forEach(plotPoint => {
      const relatedHints = plotPoint.hints.filter(h => h.chapterId === chapterId);
      const isRelatedChapter = plotPoint.relatedChapterIds.includes(chapterId);

      if (relatedHints.length > 0 || isRelatedChapter) {
        plotPoint.hints.forEach(hint => {
          if (hint.chapterId === chapterId) {
            const hintKeywords = extractKeywords(hint.hintText);
            const result = fuzzyMatch(chapter.content, hintKeywords, hint.hintText);
            if (result.matched) {
              const lineNumber = findLineNumber(chapter.content, hintKeywords.concat([hint.hintText]));
              warnings.push({
                id: `conflict-hint-${chapterId}-${hint.id}-${Date.now()}`,
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

        const descriptionKeywords = extractKeywords(plotPoint.title + ' ' + plotPoint.description);
        const descResult = fuzzyMatch(chapter.content, descriptionKeywords, plotPoint.title);
        
        if (plotPoint.status === 'pending' && (isRelatedChapter || descResult.matched)) {
          const lineNumber = descResult.matched ? findLineNumber(chapter.content, descriptionKeywords) : undefined;
          warnings.push({
            id: `conflict-pending-${chapterId}-${plotPoint.id}-${Date.now()}`,
            chapterId,
            plotPointId: plotPoint.id,
            plotPoint,
            severity: 'warning',
            message: `本章关联了伏笔"${plotPoint.title}"（${plotPoint.description.slice(0, 30)}${plotPoint.description.length > 30 ? '...' : ''}），但该伏笔尚未解决。如果本章内容涉及该伏笔的进展，请更新伏笔状态。`,
            lineNumber: lineNumber > 0 ? lineNumber : undefined,
            createdAt: new Date(),
            resolved: false,
          });
        }

        if (plotPoint.status === 'resolved' && isRelatedChapter) {
          const resolutionKeywords = extractKeywords(plotPoint.description);
          const hasResolution = fuzzyMatch(chapter.content, resolutionKeywords, '');
          if (!hasResolution.matched && chapter.content.trim().length > 0) {
            warnings.push({
              id: `conflict-resolved-${chapterId}-${plotPoint.id}-${Date.now()}`,
              chapterId,
              plotPointId: plotPoint.id,
              plotPoint,
              severity: 'warning',
              message: `伏笔"${plotPoint.title}"已标记为已回收，但本章内容中未检测到回收相关的描述。请确认伏笔回收是否完整。`,
              createdAt: new Date(),
              resolved: false,
            });
          }
        }
      }
    });

    state.characters.forEach(character => {
      const appearsInChapter = character.appearances.some(a => a.chapterId === chapterId);
      if (!appearsInChapter) return;

      for (const [traitKey, traitValue] of Object.entries(character.traits)) {
        if (!traitValue || traitValue.length < 2) continue;
        const traitKeywords = extractKeywords(String(traitValue));
        const negationPatterns = [`不是${traitValue}`, `并非${traitValue}`, `不再${traitValue}`, `假装${traitValue}`];
        const hasNegation = negationPatterns.some(p => chapter.content.includes(p));
        
        if (hasNegation && traitKey === 'occupation' || traitKey === '身份') {
          warnings.push({
            id: `conflict-char-${chapterId}-${character.id}-${traitKey}-${Date.now()}`,
            chapterId,
            characterId: character.id,
            character,
            severity: 'warning',
            message: `人物"${character.name}"的${traitKey}设定为"${traitValue}"，但章节内容中出现了"${negationPatterns.find(p => chapter.content.includes(p))}"的描述，可能存在人物设定冲突。`,
            createdAt: new Date(),
            resolved: false,
          });
        }
      }
    });

    set(state => ({
      conflictWarnings: [
        ...state.conflictWarnings.filter(c => c.chapterId !== chapterId),
        ...previouslyResolved,
        ...warnings,
      ],
    }));

    return [...previouslyResolved, ...warnings];
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

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const margin = config.margin;
    const contentWidthMm = pageWidthMm - margin.left - margin.right;
    const contentHeightMm = pageHeightMm - margin.top - margin.bottom;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pxPerMm = 3.78;
    const contentWidthPx = contentWidthMm * pxPerMm;
    const contentHeightPx = contentHeightMm * pxPerMm;

    const createRenderContainer = () => {
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: ${contentWidthPx}px;
        padding: 0;
        font-family: -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "SimSun", sans-serif;
        font-size: ${config.fontSize * pxPerMm}px;
        line-height: ${config.lineHeight};
        color: #000;
        background: #fff;
        word-wrap: break-word;
        white-space: pre-wrap;
      `;
      return container;
    };

    const renderToCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
      document.body.appendChild(element);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      document.body.removeChild(element);
      return canvas;
    };

    const addImageToPage = (canvas: HTMLCanvasElement, yOffset: number) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgHeightMm = (canvas.height / canvas.width) * contentWidthMm;
      doc.addImage(imgData, 'JPEG', margin.left, margin.top + yOffset, contentWidthMm, imgHeightMm);
    };

    let currentPageY = 0;

    if (config.includeCover) {
      const coverContainer = createRenderContainer();
      coverContainer.style.width = `${pageWidthMm * pxPerMm}px`;
      coverContainer.style.height = `${pageHeightMm * pxPerMm}px`;
      coverContainer.style.cssText += `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%);
        color: #ffffff;
        text-align: center;
        padding: 40px;
      `;
      coverContainer.innerHTML = `
        <div style="font-size: ${36 * pxPerMm}px; font-weight: bold; margin-bottom: 30px; font-family: serif;">${config.title}</div>
        ${config.author ? `<div style="font-size: ${14 * pxPerMm}px; color: #d4af37;">${config.author}</div>` : ''}
      `;
      const coverCanvas = await renderToCanvas(coverContainer);
      const coverImg = coverCanvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(coverImg, 'JPEG', 0, 0, pageWidthMm, pageHeightMm);
      doc.addPage();
    }

    if (config.includeToc) {
      const tocContainer = createRenderContainer();
      tocContainer.innerHTML = `<div style="font-size: ${20 * pxPerMm}px; font-weight: bold; color: #1e3a5f; margin-bottom: 15px; font-family: serif;">目录</div>`;
      const chapters = config.chapterIds.map((id, idx) => {
        const chapter = get().chapters.find(c => c.id === id);
        return chapter ? `${idx + 1}. ${chapter.title}` : '';
      }).filter(Boolean);
      tocContainer.innerHTML += chapters.map(c => `<div style="margin-bottom: 8px;">${c}</div>`).join('');
      const tocCanvas = await renderToCanvas(tocContainer);
      addImageToPage(tocCanvas, 0);
      doc.addPage();
    }

    let pageNum = (config.includeCover ? 1 : 0) + (config.includeToc ? 1 : 0);

    for (let chapIdx = 0; chapIdx < config.chapterIds.length; chapIdx++) {
      const chapterId = config.chapterIds[chapIdx];
      const chapter = get().chapters.find(c => c.id === chapterId);
      if (!chapter) continue;

      if (chapIdx > 0 || config.includeToc || config.includeCover) {
        doc.addPage();
        pageNum++;
        currentPageY = 0;
      }

      const contentContainer = createRenderContainer();
      contentContainer.innerHTML = `
        <div style="font-size: ${18 * pxPerMm}px; font-weight: bold; color: #1e3a5f; margin-bottom: 12px; font-family: serif;">${chapter.title}</div>
        <div style="border-bottom: 2px solid #d4af37; width: 120px; margin-bottom: 15px;"></div>
        <div style="white-space: pre-wrap; font-family: -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif;">${chapter.content}</div>
      `;

      const fullCanvas = await renderToCanvas(contentContainer);
      const totalHeightPx = fullCanvas.height;
      let yCursor = 0;

      while (yCursor < totalHeightPx) {
        const sliceHeightPx = Math.min(contentHeightPx, totalHeightPx - yCursor);
        
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = fullCanvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          fullCanvas,
          0, yCursor, fullCanvas.width, sliceHeightPx,
          0, 0, fullCanvas.width, sliceHeightPx
        );

        if (yCursor > 0) {
          doc.addPage();
          pageNum++;
        }

        const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHeightMm = (sliceHeightPx / fullCanvas.width) * contentWidthMm;
        doc.addImage(sliceImgData, 'JPEG', margin.left, margin.top, contentWidthMm, sliceHeightMm);

        if (config.includePageNumbers) {
          doc.setFontSize(10);
          doc.setTextColor(128, 128, 128);
          doc.text(`- ${pageNum} -`, pageWidthMm / 2, pageHeightMm - margin.bottom / 2, { align: 'center' });
        }

        yCursor += contentHeightPx;
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
    const state = get();
    const characterId = `char-${Date.now()}`;

    const validatedRelationships: CharacterRelation[] = Array.isArray(character.relationships)
      ? character.relationships
          .filter((rel): rel is NonNullable<typeof rel> => rel != null && typeof rel === 'object')
          .map((rel, idx) => {
            const targetChar = state.characters.find(c => c.id === rel.targetId);
            if (!targetChar && rel.targetId) {
              const fallbackTarget = state.characters.find(c => c.id === rel.targetId);
              if (!fallbackTarget) return null;
            }
            const resolvedTarget = targetChar || state.characters.find(c => c.id === rel.targetId);
            return {
              id: rel.id || `rel-${characterId}-${idx}-${Date.now()}`,
              characterId,
              targetId: rel.targetId,
              target: resolvedTarget || {
                id: rel.targetId,
                projectId: character.projectId,
                name: '未知人物',
                description: '',
                traits: {},
                relationships: [],
                appearances: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              type: String(rel.type || '关联'),
              description: rel.description,
            };
          })
          .filter((rel): rel is CharacterRelation => rel !== null)
      : [];

    const validatedAppearances: CharacterAppearance[] = Array.isArray(character.appearances)
      ? character.appearances
          .filter((app): app is NonNullable<typeof app> => app != null && typeof app === 'object')
          .map((app, idx) => {
            const chapter = state.chapters.find(c => c.id === app.chapterId);
            return {
              id: app.id || `app-${characterId}-${idx}-${Date.now()}`,
              characterId,
              chapterId: app.chapterId,
              chapter: chapter || {
                id: app.chapterId,
                projectId: character.projectId,
                title: '未知章节',
                content: '',
                order: 0,
                wordCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              context: app.context,
              createdAt: app.createdAt || new Date(),
            };
          })
      : [];

    const newCharacter: Character = {
      id: characterId,
      projectId: character.projectId,
      name: String(character.name || ''),
      avatarUrl: character.avatarUrl,
      description: String(character.description || ''),
      traits: character.traits && typeof character.traits === 'object'
        ? Object.fromEntries(
            Object.entries(character.traits)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [String(k), String(v)])
          )
        : {},
      relationships: validatedRelationships,
      appearances: validatedAppearances,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set(state => ({
      characters: [...state.characters, newCharacter],
    }));

    return newCharacter;
  },

  updateCharacter: (characterId: string, updates: Partial<Character>) => {
    const state = get();

    let validatedUpdates: Partial<Character> = { ...updates };

    if (updates.relationships) {
      validatedUpdates.relationships = updates.relationships
        .filter((rel): rel is NonNullable<typeof rel> => rel != null && typeof rel === 'object')
        .map((rel, idx) => {
          const targetChar = state.characters.find(c => c.id === rel.targetId);
          if (!targetChar && rel.targetId) {
            const fallback = state.characters.find(c => c.id === rel.targetId);
            if (!fallback) return null;
          }
          const resolvedTarget = targetChar || state.characters.find(c => c.id === rel.targetId);
          return {
            id: rel.id || `rel-${characterId}-${idx}-${Date.now()}`,
            characterId,
            targetId: rel.targetId,
            target: resolvedTarget || {
              id: rel.targetId,
              projectId: '',
              name: '未知人物',
              description: '',
              traits: {},
              relationships: [],
              appearances: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            type: String(rel.type || '关联'),
            description: rel.description,
          };
        })
        .filter((rel): rel is CharacterRelation => rel !== null);
    }

    if (updates.traits) {
      validatedUpdates.traits = Object.fromEntries(
        Object.entries(updates.traits)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [String(k), String(v)])
      );
    }

    set(state => ({
      characters: state.characters.map(c =>
        c.id === characterId
          ? { ...c, ...validatedUpdates, updatedAt: new Date() }
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
