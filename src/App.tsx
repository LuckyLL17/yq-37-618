import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProjectsList from "@/pages/ProjectsList";
import ProjectOverview from "@/pages/ProjectOverview";
import ChapterEditor from "@/pages/ChapterEditor";
import VersionHistory from "@/pages/VersionHistory";
import CharacterEncyclopedia from "@/pages/CharacterEncyclopedia";
import PlotManager from "@/pages/PlotManager";
import ExportCenter from "@/pages/ExportCenter";
import ProjectLayout from "@/components/ProjectLayout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route
          path="/projects/:projectId"
          element={
            <ProjectLayout>
              <ProjectOverview />
            </ProjectLayout>
          }
        />
        <Route
          path="/projects/:projectId/chapters"
          element={
            <ProjectLayout>
              <ChapterEditor />
            </ProjectLayout>
          }
        />
        <Route
          path="/projects/:projectId/chapters/:chapterId"
          element={
            <ProjectLayout>
              <ChapterEditor />
            </ProjectLayout>
          }
        />
        <Route
          path="/projects/:projectId/chapters/:chapterId/history"
          element={
            <ProjectLayout>
              <VersionHistory />
            </ProjectLayout>
          }
        />
        <Route
          path="/projects/:projectId/characters"
          element={
            <ProjectLayout>
              <CharacterEncyclopedia />
            </ProjectLayout>
          }
        />
        <Route
          path="/projects/:projectId/plot"
          element={
            <ProjectLayout>
              <PlotManager />
            </ProjectLayout>
          }
        />
        <Route
          path="/projects/:projectId/export"
          element={
            <ProjectLayout>
              <ExportCenter />
            </ProjectLayout>
          }
        />
      </Routes>
    </Router>
  );
}
