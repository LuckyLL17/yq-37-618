import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Lock,
  Unlock,
  Save,
  History,
  Plus,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  User,
  Clock,
  Edit3,
  BookOpen,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { ConflictWarning } from '@shared/types';

export default function ChapterEditor() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const {
    chapters,
    currentChapter,
    setCurrentChapter,
    updateChapterContent,
    updateChapterTitle,
    lockChapter,
    unlockChapter,
    createVersion,
    checkConflicts,
    resolveConflict,
    getCharactersForChapter,
    getPlotPointsForChapter,
    currentUser,
    isLoading,
  } = useAppStore();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLockedByMe, setIsLockedByMe] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionSummary, setVersionSummary] = useState('');
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'info' | 'conflicts'>('info');

  const projectChapters = chapters.filter(c => c.projectId === projectId);

  useEffect(() => {
    if (chapterId) {
      setCurrentChapter(chapterId);
    }
    return () => setCurrentChapter(null);
  }, [chapterId, setCurrentChapter]);

  useEffect(() => {
    if (currentChapter) {
      setContent(currentChapter.content);
      setTitle(currentChapter.title);
      setIsLockedByMe(currentChapter.lock?.userId === currentUser.id);
      setLastSaved(null);
      if (currentChapter.id) {
        checkConflicts(currentChapter.id).then(setConflicts);
      }
    }
  }, [currentChapter, currentUser.id, checkConflicts]);

  const handleContentChange = useCallback(async (newContent: string) => {
    setContent(newContent);
    
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    
    const timer = setTimeout(async () => {
      if (currentChapter && isLockedByMe) {
        await updateChapterContent(currentChapter.id, newContent);
        setLastSaved(new Date());
        if (currentChapter.id) {
          const newConflicts = await checkConflicts(currentChapter.id);
          setConflicts(newConflicts);
        }
      }
    }, 2000);
    
    setAutoSaveTimer(timer);
  }, [currentChapter, isLockedByMe, autoSaveTimer, updateChapterContent, checkConflicts]);

  const handleLock = async () => {
    if (!currentChapter) return;
    const success = await lockChapter(currentChapter.id);
    if (success) {
      setIsLockedByMe(true);
    }
  };

  const handleUnlock = async () => {
    if (!currentChapter) return;
    await unlockChapter(currentChapter.id);
    setIsLockedByMe(false);
  };

  const handleSaveVersion = async () => {
    if (!currentChapter || !versionSummary.trim()) return;
    await createVersion(currentChapter.id, versionSummary);
    setVersionSummary('');
    setShowVersionModal(false);
  };

  const handleWordCount = (text: string) => {
    return text.replace(/\s/g, '').length;
  };

  const relatedCharacters = currentChapter ? getCharactersForChapter(currentChapter.id) : [];
  const relatedPlotPoints = currentChapter ? getPlotPointsForChapter(currentChapter.id) : [];
  const unresolvedConflicts = conflicts.filter(c => !c.resolved);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className="w-64 flex-shrink-0">
        <div className="card p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold text-ink-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold-500" />
              章节目录
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
            {projectChapters.map((chapter, index) => {
              const isActive = currentChapter?.id === chapter.id;
              const isLocked = !!chapter.lock;
              const isLockedByOther = isLocked && chapter.lock?.userId !== currentUser.id;

              return (
                <Link
                  key={chapter.id}
                  to={`/projects/${projectId}/chapters/${chapter.id}`}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg transition-all group',
                    isActive
                      ? 'bg-ink-800 text-white'
                      : isLockedByOther
                        ? 'bg-brick-50 text-brick-700 cursor-not-allowed opacity-75'
                        : 'hover:bg-paper-200 text-ink-700'
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded flex items-center justify-center text-sm font-serif',
                    isActive ? 'bg-ink-700' : 'bg-paper-200 text-ink-500'
                  )}>
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {chapter.title}
                  </span>
                  {isLocked && (
                    <span
                      title={isLockedByOther ? `被 ${chapter.lock?.user.username} 锁定` : '已被您锁定'}
                    >
                      <Lock
                        className={cn(
                          'w-4 h-4',
                          isActive ? 'text-gold-400' : 'text-brick-500'
                        )}
                      />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <button className="mt-4 btn-secondary w-full flex items-center justify-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            新建章节
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {currentChapter ? (
          <>
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => updateChapterTitle(currentChapter.id, title)}
                    className={cn(
                      'font-serif text-2xl font-bold bg-transparent border-none outline-none w-full',
                      isLockedByMe
                        ? 'text-ink-800 focus:ring-2 focus:ring-gold-200 rounded px-2'
                        : 'text-ink-500 cursor-not-allowed'
                    )}
                    disabled={!isLockedByMe}
                  />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-sm text-ink-400 flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {handleWordCount(content).toLocaleString()} 字
                  </div>
                  {lastSaved && (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      已自动保存
                    </div>
                  )}
                  {isLockedByMe ? (
                    <>
                      <button
                        onClick={() => setShowVersionModal(true)}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        保存版本
                      </button>
                      <Link
                        to={`/projects/${projectId}/chapters/${currentChapter.id}/history`}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        <History className="w-4 h-4" />
                        历史版本
                      </Link>
                      <button
                        onClick={handleUnlock}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        <Unlock className="w-4 h-4" />
                        解锁
                      </button>
                    </>
                  ) : currentChapter.lock ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-brick-50 rounded-lg border border-brick-200">
                      <Lock className="w-4 h-4 text-brick-500" />
                      <div className="text-sm">
                        <div className="text-brick-700 font-medium">
                          被 {currentChapter.lock.user.username} 锁定
                        </div>
                        <div className="text-brick-500 text-xs">
                          {currentChapter.lock.expiresAt && `将在 ${new Date(currentChapter.lock.expiresAt).toLocaleTimeString()} 过期`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleLock}
                      className="btn-gold flex items-center gap-2 text-sm"
                      disabled={isLoading}
                    >
                      <Lock className="w-4 h-4" />
                      {isLoading ? '锁定中...' : '锁定并编辑'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card flex-1 flex flex-col overflow-hidden">
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                disabled={!isLockedByMe}
                placeholder={isLockedByMe ? '开始创作...' : '章节已被锁定，无法编辑'}
                className={cn(
                  'flex-1 w-full p-8 resize-none bg-paper-50/50 paper-bg font-serif text-lg leading-8 text-ink-800',
                  'outline-none border-none scrollbar-thin',
                  !isLockedByMe && 'cursor-not-allowed opacity-60',
                  isLockedByMe && 'animate-pulse-gold'
                )}
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="card flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-ink-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-ink-600 mb-2">选择章节</h3>
              <p className="text-ink-400">从左侧目录选择一个章节开始编辑</p>
            </div>
          </div>
        )}
      </div>

      {currentChapter && (
        <div className="w-80 flex-shrink-0">
          <div className="card h-full flex flex-col">
            <div className="flex border-b border-paper-200">
              <button
                onClick={() => setSidebarTab('info')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  sidebarTab === 'info'
                    ? 'text-ink-800 border-b-2 border-gold-500'
                    : 'text-ink-400 hover:text-ink-600'
                )}
              >
                相关信息
              </button>
              <button
                onClick={() => setSidebarTab('conflicts')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
                  sidebarTab === 'conflicts'
                    ? 'text-ink-800 border-b-2 border-gold-500'
                    : 'text-ink-400 hover:text-ink-600'
                )}
              >
                冲突检测
                {unresolvedConflicts.length > 0 && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-brick-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unresolvedConflicts.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              {sidebarTab === 'info' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-gold-500" />
                      本章出场人物
                    </h3>
                    {relatedCharacters.length > 0 ? (
                      <div className="space-y-2">
                        {relatedCharacters.map((char) => (
                          <div
                            key={char.id}
                            className="flex items-center gap-3 p-2 bg-paper-100 rounded-lg"
                          >
                            <img
                              src={char.avatarUrl}
                              alt={char.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="text-sm font-medium text-ink-700">{char.name}</div>
                              <div className="text-xs text-ink-400 truncate">
                                {char.traits.occupation}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-400">暂无出场人物</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-gold-500" />
                      关联伏笔
                    </h3>
                    {relatedPlotPoints.length > 0 ? (
                      <div className="space-y-2">
                        {relatedPlotPoints.map((point) => (
                          <div
                            key={point.id}
                            className="p-3 bg-paper-100 rounded-lg"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                point.status === 'resolved'
                                  ? 'bg-green-100 text-green-700'
                                  : point.status === 'active'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-ink-100 text-ink-600'
                              )}>
                                {point.status === 'resolved' ? '已回收' : point.status === 'active' ? '进行中' : '待回收'}
                              </span>
                              <span className="text-xs text-gold-600 bg-gold-50 px-2 py-0.5 rounded">
                                {point.type === 'foreshadow' ? '伏笔' : point.type === 'climax' ? '高潮' : point.type === 'turning' ? '转折' : '结局'}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-ink-700">{point.title}</div>
                            <p className="text-xs text-ink-400 mt-1 line-clamp-2">{point.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-400">暂无关联伏笔</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gold-500" />
                      章节信息
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-ink-400">创建时间</span>
                        <span className="text-ink-600">
                          {currentChapter.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-400">最后更新</span>
                        <span className="text-ink-600">
                          {currentChapter.updatedAt.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-400">当前字数</span>
                        <span className="text-ink-600">
                          {handleWordCount(content).toLocaleString()} 字
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {unresolvedConflicts.length > 0 ? (
                    unresolvedConflicts.map((warning) => (
                      <div
                        key={warning.id}
                        className={cn(
                          'p-4 rounded-xl border',
                          warning.severity === 'error'
                            ? 'bg-brick-50 border-brick-200 animate-shake'
                            : warning.severity === 'warning'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-blue-50 border-blue-200'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                            warning.severity === 'error'
                              ? 'bg-brick-100 text-brick-600'
                              : warning.severity === 'warning'
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-blue-100 text-blue-600'
                          )}>
                            {warning.severity === 'error' || warning.severity === 'warning' ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Info className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-ink-700">{warning.message}</p>
                            {warning.lineNumber && (
                              <p className="text-xs text-ink-400 mt-1">
                                位置：第 {warning.lineNumber} 行
                              </p>
                            )}
                            <button
                              onClick={() => resolveConflict(warning.id)}
                              className="mt-2 text-xs text-ink-500 hover:text-ink-700 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              标记为已处理
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-ink-600 font-medium">未检测到冲突</p>
                      <p className="text-sm text-ink-400 mt-1">情节和人物设定保持一致</p>
                    </div>
                  )}

                  {conflicts.filter(c => c.resolved).length > 0 && (
                    <div className="pt-4 border-t border-paper-200">
                      <h4 className="text-sm font-medium text-ink-500 mb-3">已处理的警告</h4>
                      <div className="space-y-2">
                        {conflicts.filter(c => c.resolved).slice(0, 3).map((warning) => (
                          <div
                            key={warning.id}
                            className="p-3 bg-paper-100 rounded-lg opacity-60"
                          >
                            <p className="text-xs text-ink-500 line-through">{warning.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showVersionModal && (
        <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="card p-6 w-full max-w-md mx-4 animate-slide-in-right">
            <h2 className="font-serif text-xl font-bold text-ink-800 mb-4">
              保存版本
            </h2>
            <p className="text-sm text-ink-500 mb-4">
              为本次修改添加一个简短的说明，方便后续追溯。
            </p>
            <textarea
              value={versionSummary}
              onChange={(e) => setVersionSummary(e.target.value)}
              className="textarea h-24"
              placeholder="例如：完善了开头场景描写，优化了对话..."
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowVersionModal(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSaveVersion}
                className="btn-gold flex-1"
                disabled={!versionSummary.trim()}
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
