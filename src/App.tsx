import { Curriculum } from "./views/Curriculum";
import { Settings, WorkspaceSearch, useAppearance } from "./views/Preferences";
import { useEffect } from "react";
import {
  BrowserRouter,
  HashRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { StoreProvider } from "./data/store";
import { Header, Footer, Guard, Workspace, Empty } from "./components/Layout";
import { Landing, Opportunities, SignIn } from "./views/Public";
import { Detail } from "./views/Detail";
import { Learning } from "./views/Skills";
import { Overview, Profile } from "./views/Workspace";
import { Staff } from "./views/Staff";
function Private({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <Workspace>{children}</Workspace>
    </Guard>
  );
}
function Pages() {
  useAppearance();
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash === "#how-it-works") {
      document.getElementById("how-it-works")?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
    document.title =
      {
        "/": "CHAMPUS | From learning to opportunity",
        "/opportunities": "Opportunities | CHAMPUS",
        "/learning": "Learning library | CHAMPUS",
        "/sign-in": "Sign in | CHAMPUS",
        "/overview": "Overview | CHAMPUS",
        "/profile": "My profile | CHAMPUS",
        "/skills": "Skill development | CHAMPUS",
        "/staff": "Review and curation | CHAMPUS",
        "/teacher": "Teaching studio | CHAMPUS",
        "/industry": "Industry desk | CHAMPUS",
        "/settings": "Settings | CHAMPUS",
        "/plan": "My learning plan | CHAMPUS",
        "/search": "Workspace search | CHAMPUS",
      }[loc.pathname] || "CHAMPUS";
  }, [loc.pathname, loc.hash]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <Routes>
        <Route
          path="/teacher"
          element={
            <Private>
              <Curriculum role="teacher" />
            </Private>
          }
        />
        <Route
          path="/industry"
          element={
            <Private>
              <Curriculum role="industry" />
            </Private>
          }
        />
        <Route
          path="/plan"
          element={
            <Private>
              <Curriculum role="student" />
            </Private>
          }
        />
        <Route
          path="/settings"
          element={
            <Private>
              <Settings />
            </Private>
          }
        />
        <Route
          path="/search"
          element={
            <Private>
              <WorkspaceSearch />
            </Private>
          }
        />
        <Route path="/" element={<Landing />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/opportunities/:id" element={<Detail />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/learning/:id" element={<Learning />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route
          path="/overview"
          element={
            <Private>
              <Overview />
            </Private>
          }
        />
        <Route
          path="/profile"
          element={
            <Private>
              <Profile />
            </Private>
          }
        />
        <Route
          path="/skills"
          element={
            <Private>
              <Learning workspace />
            </Private>
          }
        />
        <Route
          path="/staff"
          element={
            <Private>
              <Staff />
            </Private>
          }
        />
        <Route
          path="*"
          element={
            <main className="wrap section" id="main">
              <Empty
                title="Page not found"
                text="Open the opportunity catalog to continue."
                action={<Link to="/opportunities">Explore opportunities</Link>}
              />
            </main>
          }
        />
      </Routes>
      <Footer />
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
