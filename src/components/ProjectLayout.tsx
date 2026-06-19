import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  FileText,
  UsersRound,
  GitBranch,
  Download,
  LogOut,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProject, currentUser, setCurrentProject } = useAppStore();

  if (!currentProject || currentProject.id !== projectId) {
    setCurrentProject(projectId!);
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  const navItems = [
    { path: `/projects/${projectId}`, label: '项目概览', icon: LayoutDashboard, exact: true },
    { path: `/projects/${projectId}/chapters`, label: '章节编辑', icon: FileText },
    { path: `/projects/${projectId}/characters`, label: '人物百科', icon: UsersRound },
    { path: `/projects/${projectId}/plot`, label: '情节管理', icon: GitBranch },
    { path: `/projects/${projectId}/export`, label: '导出中心', icon: Download },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-paper-100">
      <header className="bg-ink-800 text-white shadow-ink">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/projects" className="flex items-center gap-2 hover:text-gold-400 transition-colors">
                <BookOpen className="w-7 h-7 text-gold-400" />
                <span className="font-serif text-xl font-bold">墨韵创作</span>
              </Link>
              <ChevronRight className="w-4 h-4 text-ink-400" />
              <span className="font-serif text-lg text-gold-300 truncate max-w-xs">
                {currentProject.title}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {currentProject.members.slice(0, 3).map(member => (
                  <div
                    key={member.userId}
                    className="group relative"
                    title={`${member.user.username} (${member.role === 'creator' ? '创建者' : member.role === 'author' ? '作者' : '浏览者'})`}
                  >
                    <img
                      src={member.user.avatarUrl}
                      alt={member.user.username}
                      className="w-8 h-8 rounded-full border-2 border-ink-700"
                    />
                    {member.role === 'creator' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gold-500 border border-ink-800" />
                    )}
                  </div>
                ))}
                {currentProject.members.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-xs text-ink-300 border-2 border-ink-700">
                    +{currentProject.members.length - 3}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pl-4 border-l border-ink-700">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm hidden sm:inline">{currentUser.username}</span>
                <button
                  onClick={() => navigate('/projects')}
                  className="p-1.5 hover:bg-ink-700 rounded-lg transition-colors"
                  title="退出项目"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-paper-50 border-r border-paper-300 min-h-[calc(100vh-4rem)] sticky top-0">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'sidebar-item group',
                    active && 'sidebar-item-active'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 transition-colors',
                    active ? 'text-gold-400' : 'text-ink-400 group-hover:text-ink-600'
                  )} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-paper-300">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-brick-600" />
                <span className="text-sm font-medium text-ink-700">章节锁定</span>
              </div>
              <p className="text-xs text-ink-500">
                编辑时系统会自动锁定章节，防止多人同时编辑造成冲突。
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
