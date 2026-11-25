import { Demo, AccountStatus } from "./views/Access";
import { previewMode } from "./data/client";
import { CourseMap } from "./views/CourseMap";
import { Administration } from "./views/Administration";
import { Programs } from "./views/Programs";
import {
  Advisor,
  Guidance,
  Partnerships,
  ClassProgress,
  Organization,
} from "./views/Collaboration";
import { homeFor, type WorkspaceKind } from "./data/platform";
import { FeaturePage } from "./views/Feature";
import { useEffect } from "react";
import {
  BrowserRouter,
  HashRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { StoreProvider, useStore } from "./data/store";
import { Footer, Guard, Workspace, Empty, Notice } from "./components/Layout";
import { Header } from "./components/Navigation";
import { Landing, Opportunities } from "./views/Public";
import { SignIn } from "./views/SignIn";
import { Detail } from "./views/Detail";
import { Learning, EvidenceList } from "./views/Skills";
import { Overview, Profile } from "./views/Workspace";
import { Staff } from "./views/Staff";
import { Curriculum, Preference } from "./views/Curriculum";
import { Settings, WorkspaceSearch } from "./views/Preferences";
import { useAppearance } from "./data/appearance";

function Home() {
  const { user, authLoading } = useStore();
  if (authLoading)
    return (
      <main id="main" className="wrap section">
        <Notice>Checking your session…</Notice>
      </main>
    );
  if (user) return <Navigate replace to="/overview" />;
  return <Landing />;
}

function WorkspaceFrame() {
  const { user, authLoading } = useStore();
  const { pathname } = useLocation();
  const shared = /^\/(opportunities|learning|search|help|programs)(\/|$)/.test(
    pathname,
  );
  if (shared && !user && !authLoading) return <Outlet />;
  return (
    <Guard>
      <Workspace>
        <Outlet />
      </Workspace>
    </Guard>
  );
}

function RolePage({
  allowed,
  children,
}: {
  allowed: WorkspaceKind[];
  children: React.ReactNode;
}) {
  const { workspace } = useStore();
  return workspace && allowed.includes(workspace) ? (
    children
  ) : (
    <Navigate replace to={homeFor(workspace)} />
  );
}

function Portfolio() {
  const { evidence } = useStore();
  return (
    <>
      <p className="overline">Student workspace</p>
      <h1 className="page-title">Evidence portfolio</h1>
      <p className="lede">
        Review submitted work, the indicator it supports and lecturer feedback.
      </p>
      {evidence.length ? (
        <EvidenceList rows={evidence} />
      ) : (
        <section className="panel">
          <h2>Start with course practice</h2>
          <p>
            Choose an indicator and submit an artifact to start your portfolio.
          </p>
          <Link to="/programs">Open course guide</Link>
        </section>
      )}
    </>
  );
}
function Help() {
  const { user } = useStore();
  const content = (
    <>
      <h1 className="page-title">Help center</h1>
      <section className="panel">
        <h2>Access your workspace</h2>
        <p>
          Your CHAMPUS contact provides access to your workspace. Sign in with
          the email and password they give you. Use Forgot password to request a
          reset.
        </p>
        {!user && <Link to="/sign-in">Sign in</Link>}
      </section>
      <section className="panel">
        <h2>Find your next action</h2>
        <p>
          Your dashboard opens the tools for your account. Students follow
          assigned course practice, teachers manage tasks and reviews, and
          partners update workplace needs.
        </p>
        <Link to={user ? "/overview" : "/features/student-dashboard"}>
          {user ? "Open dashboard" : "See how CHAMPUS works"}
        </Link>
      </section>
      <section className="panel" id="feedback">
        <h2>Give feedback</h2>
        <p>
          Describe the page, what you tried and what you expected. Leave out
          student records and passwords.
        </p>
        <a
          href="https://github.com/ITOLEO/CHAMPUS-student-intelligences/issues/new"
          target="_blank"
          rel="noreferrer"
        >
          Open a public GitHub issue
        </a>
      </section>
    </>
  );
  return user ? (
    content
  ) : (
    <main id="main" className="wrap section">
      {content}
    </main>
  );
}

function Pages() {
  useAppearance();
  const { user } = useStore();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "From learning to opportunity",
      "/opportunities": "Opportunities",
      "/learning": "Learning library",
      "/sign-in": "Sign in",
      "/overview": "Dashboard",
      "/learning-preferences": "Learning preferences",
      "/profile": "My profile",
      "/skills": "Skill development",
      "/staff": "Review and curation",
      "/campus": "Campus dashboard",
      "/admin": "Account administration",
      "/programs": "Course guide",
      "/advisor": "AI advisor",
      "/guidance": "Learning guidance",
      "/progress": "Class progress",
      "/partnerships": "Partnerships",
      "/industry": "Industry desk",
      "/settings": "Settings",
      "/plan": "My learning plan",
      "/search": "Search",
      "/help": "Help center",
    };
    document.title = titles[pathname]
      ? titles[pathname] + " | CHAMPUS"
      : "CHAMPUS";
  }, [pathname]);
  const showFooter = !user && pathname !== "/status";
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(event) => {
          const main = document.getElementById("main");
          if (!main) return;
          event.preventDefault();
          main.setAttribute("tabindex", "-1");
          main.focus();
        }}
      >
        Skip to content
      </a>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<AccountStatus />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/welcome" element={<Navigate replace to="/" />} />
        <Route path="/features/:id" element={<FeaturePage />} />
        <Route
          path="/sign-in"
          element={previewMode ? <Navigate replace to="/demo" /> : <SignIn />}
        />
        <Route element={<WorkspaceFrame />}>
          <Route
            path="/opportunities"
            element={<Opportunities workspace={!!user} />}
          />
          <Route
            path="/opportunities/:id"
            element={<Detail workspace={!!user} />}
          />
          <Route path="/learning" element={<Learning workspace={!!user} />} />
          <Route
            path="/learning/:id"
            element={<Learning workspace={!!user} />}
          />
          <Route path="/search" element={<WorkspaceSearch />} />
          <Route path="/help" element={<Help />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/teacher" element={<Navigate replace to="/campus" />} />
          <Route
            path="/campus"
            element={
              <RolePage allowed={["campus"]}>
                <Curriculum role="teacher" />
              </RolePage>
            }
          />
          <Route
            path="/course-map"
            element={
              <RolePage allowed={["student", "campus"]}>
                <CourseMap />
              </RolePage>
            }
          />
          <Route
            path="/portfolio"
            element={
              <RolePage allowed={["student"]}>
                <Portfolio />
              </RolePage>
            }
          />
          <Route
            path="/organization"
            element={
              <RolePage allowed={["industry"]}>
                <Organization />
              </RolePage>
            }
          />
          <Route
            path="/admin"
            element={
              <RolePage allowed={["admin"]}>
                <Administration />
              </RolePage>
            }
          />
          <Route
            path="/access-history"
            element={
              <RolePage allowed={["admin"]}>
                <Administration />
              </RolePage>
            }
          />
          <Route path="/programs" element={<Programs />} />
          <Route
            path="/advisor"
            element={
              <RolePage allowed={["student", "campus", "industry"]}>
                <Advisor />
              </RolePage>
            }
          />
          <Route
            path="/guidance"
            element={
              <RolePage allowed={["student", "campus"]}>
                <Guidance />
              </RolePage>
            }
          />
          <Route
            path="/partnerships"
            element={
              <RolePage allowed={["campus", "industry"]}>
                <Partnerships />
              </RolePage>
            }
          />
          <Route
            path="/progress"
            element={
              <RolePage allowed={["campus"]}>
                <ClassProgress />
              </RolePage>
            }
          />
          <Route
            path="/industry"
            element={
              <RolePage allowed={["industry"]}>
                <Curriculum role="industry" />
              </RolePage>
            }
          />
          <Route
            path="/plan"
            element={
              <RolePage allowed={["student"]}>
                <Curriculum role="student" />
              </RolePage>
            }
          />
          <Route
            path="/skills"
            element={
              <RolePage allowed={["student"]}>
                <Learning workspace />
              </RolePage>
            }
          />
          <Route
            path="/learning-preferences"
            element={
              <RolePage allowed={["student"]}>
                <Preference />
              </RolePage>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/staff"
            element={
              <RolePage allowed={["campus"]}>
                <Staff />
              </RolePage>
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <main className="wrap section" id="main">
              <Empty
                title="Page not found"
                text="Check the address or return to CHAMPUS."
                action={
                  <Link to={user ? "/overview" : "/"}>
                    {user ? "Return to dashboard" : "Return home"}
                  </Link>
                }
              />
            </main>
          }
        />
      </Routes>
      {showFooter && <Footer />}
    </>
  );
}
export default function App() {
  const Router =
    window.location.protocol === "file:" ? HashRouter : BrowserRouter;
  return (
    <Router basename={previewMode ? "/preview" : undefined}>
      <StoreProvider>
        <Pages />
      </StoreProvider>
    </Router>
  );
}
