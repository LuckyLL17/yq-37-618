import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  Flame,
  Target,
  Flag,
  Edit3,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { PlotPoint, PlotPointType, PlotPointStatus } from '@shared/types';

export default function PlotManager() {
  const { projectId } = useParams<{ projectId: string }>();
  const { plotPoints, chapters, conflictWarnings } = useAppStore();

  const [selectedType, setSelectedType] = useState<PlotPointType | 'all'>('all');
  const [expandedPlot, setExpandedPlot] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlot, setNewPlot] = useState({
    title: '',
    description: '',
    type: 'foreshadow' as PlotPointType,
    status: 'pending' as PlotPointStatus,
    relatedChapterIds: [] as string[],
    relatedCharacterIds: [] as string[],
  });

  const projectPlots = plotPoints.filter(p => p.projectId === projectId);
  const filteredPlots = selectedType === 'all'
    ? projectPlots
    : projectPlots.filter(p => p.type === selectedType);

  const projectChapters = chapters.filter(c => c.projectId === projectId);

  const typeConfig: Record<PlotPointType, { label: string; icon: any; color: string }> = {
    foreshadow: { label: '伏笔', icon: Sparkles, color: 'text-purple-600 bg-purple-100' },
    climax: { label: '高潮', icon: Flame, color: 'text-orange-600 bg-orange-100' },
    turning: { label: '转折', icon: Target, color: 'text-blue-600 bg-blue-100' },
    ending: { label: '结局', icon: Flag, color: 'text-green-600 bg-green-100' },
  };

  const statusConfig: Record<PlotPointStatus, { label: string; icon: any; color: string }> = {
    pending: { label: '待回收', icon: Clock, color: 'text-ink-600 bg-ink-100' },
    active: { label: '进行中', icon: Eye, color: 'text-amber-600 bg-amber-100' },
    resolved: { label: '已回收', icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
  };

  const getChapterTitle = (chapterId: string) => {
    return chapters.find(c => c.id === chapterId)?.title || '未知章节';
  };

  const unresolvedConflicts = conflictWarnings.filter(
    c => !c.resolved && projectPlots.some(p => p.id === c.plotPointId)
  );

  const stats = {
    total: projectPlots.length,
    pending: projectPlots.filter(p => p.status === 'pending').length,
    active: projectPlots.filter(p => p.status === 'active').length,
    resolved: projectPlots.filter(p => p.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 grain-overlay relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-gold opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-serif text-2xl font-bold text-ink-800 flex items-center gap-3">
                <GitBranch className="w-7 h-7 text-gold-500" />
                情节管理
              </h1>
              <p className="text-ink-500 mt-1">
                管理小说的伏笔、线索和关键情节走向
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-gold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              添加情节
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-paper-50 rounded-xl p-4 border border-paper-200">
              <div className="text-3xl font-bold text-ink-800">{stats.total}</div>
              <div className="text-sm text-ink-500">总情节点</div>
            </div>
            <div className="bg-ink-50 rounded-xl p-4 border border-ink-200">
              <div className="text-3xl font-bold text-ink-600">{stats.pending}</div>
              <div className="text-sm text-ink-500">待回收</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="text-3xl font-bold text-amber-600">{stats.active}</div>
              <div className="text-sm text-amber-600">进行中</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-green-600">已回收</div>
            </div>
          </div>
        </div>
      </div>

      {unresolvedConflicts.length > 0 && (
        <div className="card p-6 border-l-4 border-brick-500">
          <h2 className="font-serif text-lg font-bold text-brick-700 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" />
            情节冲突警告 ({unresolvedConflicts.length})
          </h2>
          <div className="space-y-3">
            {unresolvedConflicts.slice(0, 3).map((warning) => (
              <div
                key={warning.id}
                className="p-4 bg-brick-50 rounded-xl border border-brick-200 animate-pulse"
              >
                <p className="text-sm text-brick-800">{warning.message}</p>
                {warning.plotPoint && (
                  <div className="mt-2 text-xs text-brick-600">
                    关联伏笔：<span className="font-medium">{warning.plotPoint.title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setSelectedType('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            selectedType === 'all'
              ? 'bg-ink-800 text-white'
              : 'bg-paper-100 text-ink-600 hover:bg-paper-200'
          )}
        >
          全部
        </button>
        {Object.entries(typeConfig).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type as PlotPointType)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                selectedType === type
                  ? 'bg-ink-800 text-white'
                  : 'bg-paper-100 text-ink-600 hover:bg-paper-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlots.map((plot, index) => {
          const typeInfo = typeConfig[plot.type];
          const statusInfo = statusConfig[plot.status];
          const TypeIcon = typeInfo.icon;
          const StatusIcon = statusInfo.icon;
          const isExpanded = expandedPlot === plot.id;

          return (
            <div
              key={plot.id}
              className={cn(
                'card card-hover overflow-hidden',
                'animate-fade-in-up'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                onClick={() => setExpandedPlot(isExpanded ? null : plot.id)}
                className="p-5 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('p-2 rounded-lg', typeInfo.color)}>
                      <TypeIcon className="w-4 h-4" />
                    </span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusInfo.color)}>
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {statusInfo.label}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-ink-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-ink-400" />
                  )}
                </div>
                <h3 className="font-serif text-lg font-bold text-ink-800 mb-2">
                  {plot.title}
                </h3>
                <p className="text-sm text-ink-500 line-clamp-2">
                  {plot.description}
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-ink-400">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{plot.relatedChapterIds.length} 个关联章节</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>{plot.hints.length} 条线索</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pt-0 border-t border-paper-200 animate-fade-in">
                  {plot.hints.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-ink-700 mb-2">线索埋点</h4>
                      <div className="space-y-2">
                        {plot.hints.map((hint) => (
                          <div
                            key={hint.id}
                            className="p-3 bg-gold-50 rounded-lg border border-gold-200"
                          >
                            <p className="text-sm text-ink-700">"{hint.hintText}"</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-ink-500">
                              <span>
                                {hint.chapterId ? getChapterTitle(hint.chapterId) : hint.locationDescription}
                              </span>
                              <span>{new Date(hint.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {plot.relatedChapterIds.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-ink-700 mb-2">关联章节</h4>
                      <div className="flex flex-wrap gap-2">
                        {plot.relatedChapterIds.map((chapterId) => (
                          <span
                            key={chapterId}
                            className="px-2 py-1 bg-paper-100 text-ink-600 text-xs rounded"
                          >
                            {getChapterTitle(chapterId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4">
                    <button className="btn-secondary text-sm flex-1 flex items-center justify-center gap-1">
                      <Edit3 className="w-4 h-4" />
                      编辑
                    </button>
                    <button className="btn-secondary text-sm px-3 text-brick-600 hover:bg-brick-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPlots.length === 0 && (
        <div className="card p-12 text-center">
          <GitBranch className="w-16 h-16 text-ink-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-ink-600 mb-2">
            {selectedType === 'all' ? '暂无情节' : `暂无${typeConfig[selectedType as PlotPointType].label}`}
          </h3>
          <p className="text-ink-400">点击上方按钮添加新的情节点</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="card p-6 w-full max-w-lg mx-4 animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl font-bold text-ink-800">
                添加情节
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-paper-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-ink-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  情节标题
                </label>
                <input
                  type="text"
                  value={newPlot.title}
                  onChange={(e) => setNewPlot({ ...newPlot, title: e.target.value })}
                  className="input"
                  placeholder="如：神秘信号伏笔"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  情节描述
                </label>
                <textarea
                  value={newPlot.description}
                  onChange={(e) => setNewPlot({ ...newPlot, description: e.target.value })}
                  className="textarea h-24"
                  placeholder="描述这个情节的内容和作用..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    类型
                  </label>
                  <select
                    value={newPlot.type}
                    onChange={(e) => setNewPlot({ ...newPlot, type: e.target.value as PlotPointType })}
                    className="input"
                  >
                    {Object.entries(typeConfig).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    状态
                  </label>
                  <select
                    value={newPlot.status}
                    onChange={(e) => setNewPlot({ ...newPlot, status: e.target.value as PlotPointStatus })}
                    className="input"
                  >
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  关联章节
                </label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto scrollbar-thin">
                  {projectChapters.map((chapter) => (
                    <label
                      key={chapter.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-paper-100 rounded-lg cursor-pointer hover:bg-paper-200 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={newPlot.relatedChapterIds.includes(chapter.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewPlot({
                              ...newPlot,
                              relatedChapterIds: [...newPlot.relatedChapterIds, chapter.id],
                            });
                          } else {
                            setNewPlot({
                              ...newPlot,
                              relatedChapterIds: newPlot.relatedChapterIds.filter(id => id !== chapter.id),
                            });
                          }
                        }}
                        className="rounded border-ink-300 text-gold-600 focus:ring-gold-500"
                      />
                      <span className="text-sm text-ink-700">{chapter.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  className="btn-gold flex-1"
                  disabled={!newPlot.title.trim()}
                >
                  创建情节
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
