import express from 'express';
import type { Request, Response } from 'express';
import {
  mockUsers,
  mockProjects,
  mockChapters,
  mockChapterVersions,
  mockCharacters,
  mockPlotPoints,
  mockConflictWarnings,
} from '../data/mockData.js';
import type { PdfExportConfig } from '../../shared/types.js';
import { diff_match_patch } from 'diff-match-patch';

const router = express.Router();
const dmp = new diff_match_patch();

router.get('/projects', (req: Request, res: Response) => {
  res.json(mockProjects);
});

router.get('/projects/:id', (req: Request, res: Response) => {
  const project = mockProjects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.post('/projects', (req: Request, res: Response) => {
  const { title, description, creatorId } = req.body;
  const newProject = {
    id: `project-${Date.now()}`,
    title,
    description,
    creatorId,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [{
      userId: creatorId,
      user: mockUsers.find(u => u.id === creatorId),
      role: 'creator' as const,
      joinedAt: new Date(),
    }],
  };
  res.status(201).json(newProject);
});

router.get('/projects/:id/chapters', (req: Request, res: Response) => {
  const chapters = mockChapters.filter(c => c.projectId === req.params.id);
  res.json(chapters);
});

router.get('/chapters/:id', (req: Request, res: Response) => {
  const chapter = mockChapters.find(c => c.id === req.params.id);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
  res.json(chapter);
});

router.put('/chapters/:id', (req: Request, res: Response) => {
  const { content, title } = req.body;
  const chapterIndex = mockChapters.findIndex(c => c.id === req.params.id);
  if (chapterIndex === -1) return res.status(404).json({ error: 'Chapter not found' });

  mockChapters[chapterIndex] = {
    ...mockChapters[chapterIndex],
    content: content ?? mockChapters[chapterIndex].content,
    title: title ?? mockChapters[chapterIndex].title,
    wordCount: content ? content.replace(/\s/g, '').length : mockChapters[chapterIndex].wordCount,
    updatedAt: new Date(),
  };
  res.json(mockChapters[chapterIndex]);
});

router.post('/chapters/:id/lock', (req: Request, res: Response) => {
  const { userId } = req.body;
  const chapter = mockChapters.find(c => c.id === req.params.id);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  if (chapter.lock && chapter.lock.userId !== userId) {
    return res.status(409).json({ error: 'Chapter already locked by another user' });
  }

  const user = mockUsers.find(u => u.id === userId);
  chapter.lock = {
    userId,
    user: user!,
    lockedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };
  res.json({ success: true, lock: chapter.lock });
});

router.post('/chapters/:id/unlock', (req: Request, res: Response) => {
  const chapter = mockChapters.find(c => c.id === req.params.id);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
  chapter.lock = undefined;
  res.json({ success: true });
});

router.get('/chapters/:id/history', (req: Request, res: Response) => {
  const versions = mockChapterVersions
    .filter(v => v.chapterId === req.params.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(versions);
});

router.post('/chapters/:id/versions', (req: Request, res: Response) => {
  const { content, authorId, changeSummary } = req.body;
  const author = mockUsers.find(u => u.id === authorId);
  const newVersion = {
    id: `version-${Date.now()}`,
    chapterId: req.params.id,
    content,
    authorId,
    author: author!,
    changeSummary,
    createdAt: new Date(),
  };
  mockChapterVersions.push(newVersion);
  res.status(201).json(newVersion);
});

router.get('/versions/diff', (req: Request, res: Response) => {
  const { oldContent, newContent } = req.query;
  if (typeof oldContent !== 'string' || typeof newContent !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  const diff = dmp.diff_main(oldContent, newContent);
  res.json(diff);
});

router.post('/versions/:id/revert', (req: Request, res: Response) => {
  const version = mockChapterVersions.find(v => v.id === req.params.id);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  const chapterIndex = mockChapters.findIndex(c => c.id === version.chapterId);
  if (chapterIndex === -1) return res.status(404).json({ error: 'Chapter not found' });

  mockChapters[chapterIndex] = {
    ...mockChapters[chapterIndex],
    content: version.content,
    wordCount: version.content.replace(/\s/g, '').length,
    updatedAt: new Date(),
  };
  res.json({ success: true, chapter: mockChapters[chapterIndex] });
});

router.get('/projects/:id/characters', (req: Request, res: Response) => {
  const characters = mockCharacters.filter(c => c.projectId === req.params.id);
  res.json(characters);
});

router.post('/projects/:id/characters', (req: Request, res: Response) => {
  const character = {
    ...req.body,
    id: `char-${Date.now()}`,
    projectId: req.params.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    relationships: [],
    appearances: [],
  };
  mockCharacters.push(character);
  res.status(201).json(character);
});

router.put('/characters/:id', (req: Request, res: Response) => {
  const index = mockCharacters.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Character not found' });
  mockCharacters[index] = { ...mockCharacters[index], ...req.body, updatedAt: new Date() };
  res.json(mockCharacters[index]);
});

router.get('/projects/:id/plot', (req: Request, res: Response) => {
  const plotPoints = mockPlotPoints.filter(p => p.projectId === req.params.id);
  res.json(plotPoints);
});

router.post('/projects/:id/plot/check', (req: Request, res: Response) => {
  const { chapterId } = req.body;
  const chapter = mockChapters.find(c => c.id === chapterId);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  const warnings = mockConflictWarnings.filter(c => c.chapterId === chapterId);
  res.json(warnings);
});

router.post('/plot/:id/hints', (req: Request, res: Response) => {
  const plotPoint = mockPlotPoints.find(p => p.id === req.params.id);
  if (!plotPoint) return res.status(404).json({ error: 'Plot point not found' });

  const hint = {
    ...req.body,
    id: `hint-${Date.now()}`,
    createdAt: new Date(),
  };
  plotPoint.hints.push(hint);
  res.status(201).json(hint);
});

router.put('/conflicts/:id/resolve', (req: Request, res: Response) => {
  const warning = mockConflictWarnings.find(c => c.id === req.params.id);
  if (!warning) return res.status(404).json({ error: 'Conflict not found' });
  warning.resolved = true;
  warning.resolvedAt = new Date();
  res.json({ success: true });
});

router.post('/export/pdf', async (req: Request, res: Response) => {
  const config: PdfExportConfig = req.body;
  
  const selectedChapters = mockChapters
    .filter(c => config.chapterIds.includes(c.id))
    .sort((a, b) => {
      const aIdx = config.chapterIds.indexOf(a.id);
      const bIdx = config.chapterIds.indexOf(b.id);
      return aIdx - bIdx;
    });

  res.json({
    success: true,
    filename: `${config.title || '小说'}.pdf`,
    chapterCount: selectedChapters.length,
    totalWords: selectedChapters.reduce((sum, c) => sum + c.wordCount, 0),
  });
});

export default router;
