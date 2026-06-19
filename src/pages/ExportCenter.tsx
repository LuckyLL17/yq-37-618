import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download,
  FileText,
  Check,
  ChevronsUpDown,
  BookOpen,
  FileDown,
  Settings,
  Eye,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { PdfExportConfig } from '@shared/types';

export default function ExportCenter() {
  const { projectId } = useParams<{ projectId: string }>();
  const { chapters, currentProject, exportToPdf, isLoading } = useAppStore();

  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'config' | 'preview'>('select');
  const [config, setConfig] = useState<PdfExportConfig>({
    projectId: projectId!,
    chapterIds: [],
    includeCover: true,
    includeToc: true,
    includePageNumbers: true,
    title: currentProject?.title || '',
    author: '',
    fontSize: 12,
    lineHeight: 1.5,
    margin: {
      top: 20,
      bottom: 20,
      left: 25,
      right: 25,
    },
  });

  const projectChapters = useMemo(() => 
    chapters.filter(c => c.projectId === projectId),
    [chapters, projectId]
  );

  const totalWords = useMemo(() => 
    selectedChapters.reduce((sum, id) => {
      const chapter = projectChapters.find(c => c.id === id);
      return sum + (chapter?.wordCount || 0);
    }, 0),
    [selectedChapters, projectChapters]
  );

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const selectAll = () => {
    setSelectedChapters(projectChapters.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedChapters([]);
  };

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const newSelected = [...selectedChapters];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSelected.length) return;
    [newSelected[index], newSelected[newIndex]] = [newSelected[newIndex], newSelected[index]];
    setSelectedChapters(newSelected);
  };

  const handleExport = async () => {
    await exportToPdf({
      ...config,
      chapterIds: selectedChapters,
    });
  };

  const getChapterTitle = (chapterId: string) => {
    return projectChapters.find(c => c.id === chapterId)?.title || '未知章节';
  };

  const getChapterWordCount = (chapterId: string) => {
    return projectChapters.find(c => c.id === chapterId)?.wordCount || 0;
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-800 flex items-center gap-3">
              <Download className="w-7 h-7 text-gold-500" />
              导出中心
            </h1>
            <p className="text-ink-500 mt-1">
              选择章节并配置格式，导出为PDF文件
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              step === 'select' ? 'bg-ink-800 text-white' : 'bg-paper-200 text-ink-500'
            )}>
              1. 选择章节
            </span>
            <ChevronsUpDown className="w-4 h-4 text-ink-300" />
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              step === 'config' ? 'bg-ink-800 text-white' : 'bg-paper-200 text-ink-500'
            )}>
              2. 配置格式
            </span>
            <ChevronsUpDown className="w-4 h-4 text-ink-300" />
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              step === 'preview' ? 'bg-ink-800 text-white' : 'bg-paper-200 text-ink-500'
            )}>
              3. 导出
            </span>
          </div>
        </div>

        {step === 'select' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-serif text-lg font-bold text-ink-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold-500" />
                  选择要导出的章节
                </h2>
                <span className="text-sm text-ink-400">
                  已选择 {selectedChapters.length} / {projectChapters.length} 章
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-gold-600 hover:text-gold-700 font-medium"
                >
                  全选
                </button>
                <span className="text-ink-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-ink-500 hover:text-ink-600 font-medium"
                >
                  取消全选
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-paper-50 rounded-xl border border-paper-200 p-4">
                <h3 className="font-medium text-ink-700 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gold-500" />
                  可选章节
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {projectChapters.map((chapter, index) => {
                    const isSelected = selectedChapters.includes(chapter.id);
                    return (
                      <div
                        key={chapter.id}
                        onClick={() => !isSelected && toggleChapter(chapter.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'bg-gold-50 border-gold-300 opacity-50 cursor-not-allowed'
                            : 'bg-white border-paper-200 hover:border-gold-300 hover:shadow-paper-hover'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-gold-500 border-gold-500 text-white'
                            : 'border-ink-300'
                        )}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-400">第{index + 1}章</span>
                            <span className="font-medium text-ink-700 truncate">{chapter.title}</span>
                          </div>
                          <span className="text-xs text-ink-400">
                            {chapter.wordCount.toLocaleString()} 字
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-xs px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full">
                            已选择
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-paper-50 rounded-xl border border-paper-200 p-4">
                <h3 className="font-medium text-ink-700 mb-4 flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-gold-500" />
                  导出顺序（可拖拽调整）
                </h3>
                {selectedChapters.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                    {selectedChapters.map((chapterId, index) => (
                      <div
                        key={chapterId}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gold-200 shadow-sm group"
                      >
                        <div className="w-6 h-6 rounded bg-gold-100 text-gold-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-ink-700 truncate block">
                            {getChapterTitle(chapterId)}
                          </span>
                          <span className="text-xs text-ink-400">
                            {getChapterWordCount(chapterId).toLocaleString()} 字
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveChapter(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-paper-200 rounded disabled:opacity-30"
                          >
                            <ChevronsUpDown className="w-4 h-4 text-ink-400 rotate-90" />
                          </button>
                          <button
                            onClick={() => moveChapter(index, 'down')}
                            disabled={index === selectedChapters.length - 1}
                            className="p-1 hover:bg-paper-200 rounded disabled:opacity-30"
                          >
                            <ChevronsUpDown className="w-4 h-4 text-ink-400 -rotate-90" />
                          </button>
                          <button
                            onClick={() => toggleChapter(chapterId)}
                            className="p-1 hover:bg-brick-50 text-brick-500 rounded ml-1"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-ink-400">
                    从左侧选择要导出的章节
                  </div>
                )}

                {selectedChapters.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-paper-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">总章节数</span>
                      <span className="font-medium text-ink-700">{selectedChapters.length} 章</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-ink-500">总字数</span>
                      <span className="font-medium text-ink-700">{totalWords.toLocaleString()} 字</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-ink-500">预计页数</span>
                      <span className="font-medium text-ink-700">
                        约 {Math.ceil(totalWords / 500)} 页
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-paper-200">
              <button
                onClick={() => {
                  setConfig(prev => ({ ...prev, chapterIds: selectedChapters }));
                  setStep('config');
                }}
                className="btn-gold flex items-center gap-2"
                disabled={selectedChapters.length === 0}
              >
                下一步：配置格式
                <ChevronsUpDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>
        )}

        {step === 'config' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-serif text-lg font-bold text-ink-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gold-500" />
              PDF 导出配置
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-paper-50 rounded-xl border border-paper-200 p-5">
                  <h3 className="font-medium text-ink-700 mb-4">基本信息</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-2">
                        作品标题
                      </label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => setConfig({ ...config, title: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-2">
                        作者署名
                      </label>
                      <input
                        type="text"
                        value={config.author}
                        onChange={(e) => setConfig({ ...config, author: e.target.value })}
                        className="input"
                        placeholder="可选，将显示在封面"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-paper-50 rounded-xl border border-paper-200 p-5">
                  <h3 className="font-medium text-ink-700 mb-4">排版选项</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-700">生成封面页</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.includeCover}
                          onChange={(e) => setConfig({ ...config, includeCover: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-paper-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-700">生成目录</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.includeToc}
                          onChange={(e) => setConfig({ ...config, includeToc: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-paper-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-700">显示页码</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.includePageNumbers}
                          onChange={(e) => setConfig({ ...config, includePageNumbers: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-paper-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-paper-50 rounded-xl border border-paper-200 p-5">
                  <h3 className="font-medium text-ink-700 mb-4">字体与间距</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-ink-700">正文字号</span>
                        <span className="text-ink-500">{config.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="16"
                        value={config.fontSize}
                        onChange={(e) => setConfig({ ...config, fontSize: Number(e.target.value) })}
                        className="w-full h-2 bg-paper-200 rounded-lg appearance-none cursor-pointer accent-gold-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-ink-700">行高</span>
                        <span className="text-ink-500">{config.lineHeight.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.2"
                        max="2.0"
                        step="0.1"
                        value={config.lineHeight}
                        onChange={(e) => setConfig({ ...config, lineHeight: Number(e.target.value) })}
                        className="w-full h-2 bg-paper-200 rounded-lg appearance-none cursor-pointer accent-gold-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-paper-50 rounded-xl border border-paper-200 p-5">
                  <h3 className="font-medium text-ink-700 mb-4">页面边距 (mm)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-ink-600 mb-1">上边距</label>
                      <input
                        type="number"
                        value={config.margin.top}
                        onChange={(e) => setConfig({
                          ...config,
                          margin: { ...config.margin, top: Number(e.target.value) }
                        })}
                        className="input py-2 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-ink-600 mb-1">下边距</label>
                      <input
                        type="number"
                        value={config.margin.bottom}
                        onChange={(e) => setConfig({
                          ...config,
                          margin: { ...config.margin, bottom: Number(e.target.value) }
                        })}
                        className="input py-2 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-ink-600 mb-1">左边距</label>
                      <input
                        type="number"
                        value={config.margin.left}
                        onChange={(e) => setConfig({
                          ...config,
                          margin: { ...config.margin, left: Number(e.target.value) }
                        })}
                        className="input py-2 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-ink-600 mb-1">右边距</label>
                      <input
                        type="number"
                        value={config.margin.right}
                        onChange={(e) => setConfig({
                          ...config,
                          margin: { ...config.margin, right: Number(e.target.value) }
                        })}
                        className="input py-2 text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-paper-200">
              <button
                onClick={() => setStep('select')}
                className="btn-secondary"
              >
                返回选择章节
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('preview')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
                <button
                  onClick={handleExport}
                  disabled={isLoading || !config.title.trim()}
                  className="btn-gold flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      导出 PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-serif text-lg font-bold text-ink-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-gold-500" />
              导出预览
            </h2>

            <div className="bg-ink-900 rounded-xl p-8 flex items-center justify-center">
              <div className="bg-white rounded shadow-2xl w-full max-w-md aspect-[210/297] flex flex-col overflow-hidden">
                {config.includeCover && (
                  <div className="flex-1 bg-ink-800 text-white flex flex-col items-center justify-center p-8">
                    <h1 className="font-serif text-2xl font-bold text-center mb-4">
                      {config.title}
                    </h1>
                    {config.author && (
                      <p className="text-gold-400">{config.author}</p>
                    )}
                    <div className="w-16 h-0.5 bg-gold-500 mt-8" />
                  </div>
                )}
                {!config.includeCover && (
                  <div className="flex-1 p-6">
                    {selectedChapters.slice(0, 2).map((chapterId, idx) => (
                      <div key={chapterId} className="mb-4">
                        <h3 className="font-serif font-bold text-ink-800 mb-2">
                          {getChapterTitle(chapterId)}
                        </h3>
                        <p className="text-xs text-ink-400 leading-relaxed line-clamp-3">
                          {projectChapters.find(c => c.id === chapterId)?.content.slice(0, 200)}...
                        </p>
                      </div>
                    ))}
                    {selectedChapters.length > 2 && (
                      <p className="text-xs text-ink-300 text-center mt-4">
                        ...还有 {selectedChapters.length - 2} 章
                      </p>
                    )}
                  </div>
                )}
                {config.includePageNumbers && (
                  <div className="p-2 text-center text-xs text-ink-400 border-t">
                    - 1 -
                  </div>
                )}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <p className="font-medium">配置已就绪</p>
                  <p className="text-sm text-green-600/80">
                    共 {selectedChapters.length} 章，{totalWords.toLocaleString()} 字，
                    约 {Math.ceil(totalWords / 500)} 页
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-paper-200">
              <button
                onClick={() => setStep('config')}
                className="btn-secondary"
              >
                返回修改配置
              </button>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="btn-gold flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    确认导出
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
