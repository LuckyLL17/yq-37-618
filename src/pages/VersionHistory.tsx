import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  RotateCcw,
  GitCompare,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { Diff } from 'diff-match-patch';

export default function VersionHistory() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const { chapters, getChapterVersions, getDiff, revertToVersion, currentUser } = useAppStore();

  const chapter = chapters.find(c => c.id === chapterId);
  const versions = chapterId ? getChapterVersions(chapterId) : [];
  
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState<string | null>(null);

  const diffResult = useMemo((): Diff[] => {
    if (!selectedVersion || !compareVersion) return [];
    const v1 = versions.find(v => v.id === compareVersion);
    const v2 = versions.find(v => v.id === selectedVersion);
    if (!v1 || !v2) return [];
    return getDiff(v1.content, v2.content);
  }, [selectedVersion, compareVersion, versions, getDiff]);

  const handleRevert = async (versionId: string) => {
    await revertToVersion(versionId);
    setShowRevertConfirm(null);
  };

  const renderDiff = (diffs: Diff[]) => {
    return diffs.map((diff, index) => {
      const [type, text] = diff;
      let className = 'text-ink-700';
      if (type === 1) className = 'bg-green-100 text-green-800';
      else if (type === -1) className = 'bg-red-100 text-red-800 line-through';
      
      return (
        <span key={index} className={className}>
          {text}
        </span>
      );
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/projects/${projectId}/chapters/${chapterId}`}
            className="p-2 hover:bg-paper-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ink-600" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-800">
              版本历史
            </h1>
            <p className="text-ink-500">
              {chapter?.title} · 共 {versions.length} 个版本
            </p>
          </div>
        </div>
        {selectedVersion && compareVersion && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-500">
              对比模式
            </span>
            <button
              onClick={() => {
                setSelectedVersion(null);
                setCompareVersion(null);
              }}
              className="btn-secondary text-sm"
            >
              退出对比
            </button>
          </div>
        )}
      </div>

      {selectedVersion && compareVersion && diffResult.length > 0 && (
        <div className="card p-6">
          <h2 className="font-serif text-lg font-bold text-ink-800 mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-gold-500" />
            版本差异对比
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs text-red-600 font-medium mb-1">旧版本</div>
              <div className="text-sm text-ink-600">
                {formatDate(versions.find(v => v.id === compareVersion)?.createdAt || new Date())}
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs text-green-600 font-medium mb-1">新版本</div>
              <div className="text-sm text-ink-600">
                {formatDate(versions.find(v => v.id === selectedVersion)?.createdAt || new Date())}
              </div>
            </div>
          </div>
          <div className="p-4 bg-paper-50 rounded-xl border border-paper-200 font-serif text-sm leading-relaxed max-h-96 overflow-y-auto scrollbar-thin">
            {renderDiff(diffResult)}
          </div>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-paper-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
              <span className="text-ink-500">新增内容</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
              <span className="text-ink-500">删除内容</span>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-serif text-lg font-bold text-ink-800 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold-500" />
          历史版本记录
        </h2>

        {versions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <p className="text-ink-500">暂无版本记录</p>
            <p className="text-sm text-ink-400 mt-1">每次保存都会创建一个新版本</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-paper-300" />
            
            {versions.map((version, index) => {
              const isSelected = selectedVersion === version.id;
              const isCompare = compareVersion === version.id;
              const isExpanded = expandedVersion === version.id;
              const isLatest = index === 0;

              return (
                <div
                  key={version.id}
                  className={cn(
                    'relative pl-14 pb-8 last:pb-0',
                    'animate-fade-in'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn(
                    'absolute left-4 w-5 h-5 rounded-full border-4 transition-all',
                    isSelected
                      ? 'bg-gold-500 border-gold-200 scale-125'
                      : isCompare
                        ? 'bg-ink-600 border-ink-200 scale-110'
                        : 'bg-paper-50 border-paper-300'
                  )}>
                    {isLatest && (
                      <div className="absolute -right-1 -top-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    'p-4 rounded-xl border transition-all cursor-pointer',
                    isSelected
                      ? 'bg-gold-50 border-gold-300 shadow-gold'
                      : isCompare
                        ? 'bg-ink-50 border-ink-300'
                        : 'bg-paper-50 border-paper-200 hover:border-gold-200 hover:shadow-paper-hover'
                  )}>
                    <div
                      onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                            v{versions.length - index}
                          </span>
                          {isLatest && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">
                              当前版本
                            </span>
                          )}
                          <span className="text-sm text-ink-400">
                            {formatDate(version.createdAt)}
                          </span>
                        </div>
                        <p className="font-medium text-ink-800">
                          {version.changeSummary}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-ink-500">
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{version.author.username}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{version.content.replace(/\s/g, '').length.toLocaleString()} 字</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-ink-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-ink-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-paper-200 animate-fade-in">
                        <div className="p-4 bg-paper-100 rounded-lg font-serif text-sm leading-relaxed text-ink-700 max-h-60 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
                          {version.content}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                          {!selectedVersion ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVersion(version.id);
                              }}
                              className="btn-gold text-sm flex items-center gap-2"
                            >
                              <GitCompare className="w-4 h-4" />
                              选择为新版本
                            </button>
                          ) : !isCompare && selectedVersion !== version.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompareVersion(version.id);
                              }}
                              className="btn-secondary text-sm flex items-center gap-2"
                            >
                              <GitCompare className="w-4 h-4" />
                              选择为旧版本
                            </button>
                          ) : null}
                          {!isLatest && version.author.id === currentUser.id && (
                            <>
                              {showRevertConfirm === version.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-brick-600">确认回滚？</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevert(version.id);
                                    }}
                                    className="btn-danger text-sm"
                                  >
                                    确认
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowRevertConfirm(null);
                                    }}
                                    className="btn-secondary text-sm"
                                  >
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRevertConfirm(version.id);
                                  }}
                                  className="btn-secondary text-sm flex items-center gap-2 text-brick-600 hover:bg-brick-50"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  回滚到此版本
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
