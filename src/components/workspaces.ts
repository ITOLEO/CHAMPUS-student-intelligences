import {
  BookOpen,
  Building2,
  Compass,
  LayoutDashboard,
  BookmarkCheck,
  ClipboardList,
  Files,
  Layers,
  Network,
  MessagesSquare,
  ShieldCheck,
  Users,
  ListChecks,
  School,
} from "lucide-react";
import type { WorkspaceKind } from "../data/platform";
export const workspaceLinks: Record<
  WorkspaceKind,
  [string, string, typeof BookOpen][]
> = {
  student: [
    ["/overview", "Overview", LayoutDashboard],
    ["/programs", "Course guide", School],
    ["/plan", "Learning plan", ListChecks],
    ["/course-map", "Course map", Network],
    ["/skills", "Skill development", BookOpen],
    ["/portfolio", "Evidence portfolio", Files],
    ["/advisor", "AI advisor", MessagesSquare],
    ["/guidance", "Learning guidance", ClipboardList],
    ["/opportunities", "Opportunities", Compass],
    ["/opportunities?saved=1", "Saved opportunities", BookmarkCheck],
  ],
  campus: [
    ["/campus", "Campus dashboard", LayoutDashboard],
    ["/partnerships", "Partnerships", Network],
    ["/programs", "Course guide", School],
    ["/course-map", "Course map", Network],
    ["/progress", "Class progress", Users],
    ["/guidance", "Learning guidance", ClipboardList],
    ["/staff", "Review and curation", ShieldCheck],
    ["/advisor", "AI advisor", MessagesSquare],
  ],
  industry: [
    ["/industry", "Industry desk", Building2],
    ["/organization", "Organization profile", Layers],
    ["/partnerships", "Partnerships", Network],
    ["/advisor", "AI advisor", MessagesSquare],
  ],
  admin: [
    ["/admin", "Account administration", ShieldCheck],
    ["/programs", "Course guide", School],
  ],
};
