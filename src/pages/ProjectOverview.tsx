import { useParams } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Users,
  TrendingUp,
  Clock,
  Edit3,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, chapters, conflictWarnings, currentUser, setCurrentChapter } = useAppStore();

  if (!currentProject) return null;

  const projectChapters = chapters.filter(c => c.projectId === projectId);
  const totalWords = projectChapters.reduce((sum, c) => sum + c.wordCount, 0);
  const lockedChapters = projectChapters.filter(c => c.lock);
  const activeConflicts = conflictWarnings.filter(c => !c.resolved && projectChapters.some(ch => ch.id === c.chapterId));

  const recentActivity = [
    { user: currentUser, action: '修改了章节', target: '第一章 启航', time: '2小时前' },
    { user: currentProject.members[1]?.user, action: '编辑了人物', target: '林远', time: '5小时前' },
    { user: currentProject.members[2]?.user, action: '添加了伏笔', target: '人类起源之谜', time: '1天前' },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6 relative overflow-hidden grain-overlay">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-gold opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-ink-800 mb-2">
                {currentProject.title}
              </h1>
              <p className="text-ink-500 max-w-2xl">
                {currentProject.description}
              </p>
            </div>
            <div className="text-right">
              <span className="gold-badge text-sm">
                进度 {Math.round((projectChapters.filter(c => c.content.length > 100).length / Math.max(projectChapters.length, 1)) * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-paper-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ink-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-ink-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink-800">{projectChapters.length}</div>
                  <div className="text-sm text-ink-500">章节</div>
                </div>
              </div>
            </div>
            <div className="bg-paper-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-gold-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink-800">{totalWords.toLocaleString()}</div>
                  <div className="text-sm text-ink-500">总字数</div>
                </div>
              </div>
            </div>
            <div className="bg-paper-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ink-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-ink-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink-800">{currentProject.members.length}</div>
                  <div className="text-sm text-ink-500">作者</div>
                </div>
              </div>
            </div>
            <div className="bg-paper-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  activeConflicts.length > 0 ? 'bg-brick-100' : 'bg-green-100'
                )}>
                  {activeConflicts.length > 0 ? (
                    <AlertCircle className="w-5 h-5 text-brick-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <div className={cn(
                    'text-2xl font-bold',
                    activeConflicts.length > 0 ? 'text-brick-600' : 'text-green-600'
                  )}>
                    {activeConflicts.length}
                  </div>
                  <div className="text-sm text-ink-500">待处理警告</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-ink-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold-500" />
                章节列表
              </h2>
              <button className="text-sm text-gold-600 hover:text-gold-700 font-medium">
                查看全部
              </button>
            </div>
            <div className="space-y-3">
              {projectChapters.slice(0, 5).map((chapter, index) => (
                <div
                  key={chapter.id}
                  onClick={() => setCurrentChapter(chapter.id)}
                  className="flex items-center justify-between p-4 bg-paper-50 rounded-xl border border-paper-200 hover:border-gold-300 hover:shadow-paper-hover transition-all cursor-pointer group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ink-100 flex items-center justify-center text-ink-600 font-serif font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-ink-800 group-hover:text-ink-900">
                          {chapter.title}
                        </h3>
                        {chapter.lock && (
                          <span className="lock-indicator" title={`被 ${chapter.lock.user.username} 锁定`}>
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-ink-400">
                        <span>{chapter.wordCount.toLocaleString()} 字</span>
                        <span>·</span>
                        <span>更新于 {chapter.updatedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-paper-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-gold rounded-full transition-all"
                        style={{ width: `${Math.min(100, chapter.wordCount / 30)}%` }}
                      />
                    </div>
                    <Edit3 className="w-4 h-4 text-ink-300 group-hover:text-gold-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {activeConflicts.length > 0 && (
            <div className="card p-6 border-l-4 border-brick-500">
              <h2 className="font-serif text-xl font-bold text-brick-700 flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5" />
                情节冲突警告
              </h2>
              <div className="space-y-3">
                {activeConflicts.slice(0, 3).map((warning) => (
                  <div
                    key={warning.id}
                    className="p-4 bg-brick-50 rounded-xl border border-brick-200 animate-shake"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className={cn(
                        'w-5 h-5 mt-0.5 flex-shrink-0',
                        warning.severity === 'error' ? 'text-brick-600' : 'text-amber-500'
                      )} />
                      <div>
                        <p className="text-ink-700 text-sm">{warning.message}</p>
                        {warning.plotPoint && (
                          <span className="inline-block mt-2 text-xs text-brick-600 bg-brick-100 px-2 py-0.5 rounded">
                            关联伏笔：{warning.plotPoint.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-serif text-xl font-bold text-ink-800 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gold-500" />
              创作团队
            </h2>
            <div className="space-y-3">
              {currentProject.members.map((member, index) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-3 hover:bg-paper-100 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <img
                      src={member.user.avatarUrl}
                      alt={member.user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    {member.role === 'creator' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 flex items-center justify-center">
                        <TrendingUp className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-ink-800">{member.user.username}</div>
                    <div className="text-xs text-ink-400">
                      {member.role === 'creator' ? '项目创建者' : member.role === 'author' ? '协作作者' : '浏览者'}
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    member.role === 'creator'
                      ? 'bg-gold-100 text-gold-700'
                      : member.role === 'author'
                        ? 'bg-ink-100 text-ink-600'
                        : 'bg-paper-200 text-ink-500'
                  )}>
                    {member.role === 'creator' ? '创建者' : member.role === 'author' ? '作者' : '浏览'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-serif text-xl font-bold text-ink-800 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gold-500" />
              最近动态
            </h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <img
                    src={activity.user?.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-ink-700">
                      <span className="font-medium">{activity.user?.username}</span>
                      {' '}{activity.action}{' '}
                      <span className="text-ink-800 font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
