import { FeaturePage } from "./views/Feature";
import { useEffect, useState } from "react";
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
import { Learning } from "./views/Skills";
import { Overview, Profile } from "./views/Workspace";
import { Staff } from "./views/Staff";
import { Curriculum } from "./views/Curriculum";
import { Settings, WorkspaceSearch } from "./views/Preferences";
import { useAppearance } from "./data/appearance";

const introductionKey = "champus.seen-introduction";

function Home() {
  const { user, authLoading } = useStore();
  const [showIntroduction] = useState(() => {
    try {
      return window.sessionStorage.getItem(introductionKey) !== "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (authLoading || user || !showIntroduction) return;
    try {
      window.sessionStorage.setItem(introductionKey, "1");
    } catch {}
  }, [authLoading, user, showIntroduction]);
  if (authLoading)
    return (
      <main id="main" className="wrap section">
        <Notice>Checking your session…</Notice>
      </main>
    );
  if (user) return <Navigate replace to="/overview" />;
  return showIntroduction ? <Landing /> : <Navigate replace to="/sign-in" />;
}

function WorkspaceFrame() {
  const { user, authLoading } = useStore();
  const { pathname } = useLocation();
  const shared = /^\/(opportunities|learning|search|help)(\/|$)/.test(pathname);
  if (shared && !user && !authLoading) return <Outlet />;
  return (
    <Guard>
      <Workspace>
        <Outlet />
      </Workspace>
    </Guard>
  );
}

function StudentPage({ children }: { children: React.ReactNode }) {
  const { roles } = useStore();
  return roles.includes("teacher") || roles.includes("industry") ? (
    <Navigate replace to="/overview" />
  ) : (
    children
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
          Open the sign-in link sent to your email. Ask your institution
          administrator to confirm any teacher or industry access.
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
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (!user) return;
    try {
      window.sessionStorage.setItem(introductionKey, "1");
    } catch {}
  }, [user?.id]);
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
      "/profile": "My profile",
      "/skills": "Skill development",
      "/staff": "Review and curation",
      "/teacher": "Teaching studio",
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
  const showFooter = !user;
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
        <Route path="/" element={<Home key={key} />} />
        <Route path="/welcome" element={<Navigate replace to="/" />} />
        <Route path="/features/:id" element={<FeaturePage />} />
        <Route path="/sign-in" element={<SignIn />} />
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
          <Route path="/teacher" element={<Curriculum role="teacher" />} />
          <Route path="/industry" element={<Curriculum role="industry" />} />
          <Route
            path="/plan"
            element={
              <StudentPage>
                <Curriculum role="student" />
              </StudentPage>
            }
          />
          <Route
            path="/skills"
            element={
              <StudentPage>
                <Learning workspace />
              </StudentPage>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/staff" element={<Staff />} />
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
    <Router>
      <StoreProvider>
        <Pages />
      </StoreProvider>
    </Router>
  );
}
