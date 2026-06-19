import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Users,
  FileText,
  Calendar,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export default function ProjectsList() {
  const { projects, currentUser } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '' });

  const handleCreate = () => {
    if (!newProject.title.trim()) return;
    setShowCreateModal(false);
    setNewProject({ title: '', description: '' });
  };

  return (
    <div className="min-h-screen bg-paper-100">
      <header className="bg-ink-800 text-white shadow-ink">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-gold-400" />
              <span className="font-serif text-2xl font-bold">墨韵创作</span>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-9 h-9 rounded-full border-2 border-gold-500"
              />
              <span className="font-medium">{currentUser.username}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink-800 mb-2">
              我的作品
            </h1>
            <p className="text-ink-500">
              共 {projects.length} 部作品，与团队共同创作
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-gold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            创建新项目
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => {
            const chapters = useAppStore.getState().chapters.filter(
              c => c.projectId === project.id
            );
            const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);
            const isCreator = project.creatorId === currentUser.id;

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={cn(
                  'card card-hover group overflow-hidden',
                  'animate-fade-in-up'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative h-40 bg-gradient-ink overflow-hidden">
                  {project.coverImage ? (
                    <img
                      src={project.coverImage}
                      alt={project.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-ink-700 to-ink-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="font-serif text-xl font-bold text-white mb-1">
                      {project.title}
                    </h2>
                    <div className="flex items-center gap-2 text-ink-200 text-sm">
                      {isCreator && (
                        <span className="gold-badge">创建者</span>
                      )}
                      <Calendar className="w-3.5 h-3.5" />
                      <span>创建于 {project.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-ink-600 text-sm line-clamp-2 mb-4">
                    {project.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-paper-200">
                    <div className="flex items-center gap-4 text-sm text-ink-500">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{chapters.length} 章</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{totalWords.toLocaleString()} 字</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-gold-600 font-medium group-hover:gap-2 transition-all">
                      <span>进入</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex -space-x-2 mt-4">
                    {project.members.slice(0, 4).map(member => (
                      <img
                        key={member.userId}
                        src={member.user.avatarUrl}
                        alt={member.user.username}
                        className="w-7 h-7 rounded-full border-2 border-paper-50"
                        title={member.user.username}
                      />
                    ))}
                    {project.members.length > 4 && (
                      <div className="w-7 h-7 rounded-full border-2 border-paper-50 bg-ink-100 flex items-center justify-center text-xs text-ink-600 font-medium">
                        +{project.members.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-ink-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-ink-600 mb-2">
              还没有作品
            </h3>
            <p className="text-ink-400 mb-6">
              点击上方按钮，开始您的创作之旅
            </p>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="card p-6 w-full max-w-md mx-4 animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-bold text-ink-800">
                创建新项目
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
                  作品名称
                </label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="input"
                  placeholder="输入您的作品名称"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  作品简介
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="textarea h-28"
                  placeholder="简单描述您的作品..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="btn-gold flex-1"
                  disabled={!newProject.title.trim()}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
