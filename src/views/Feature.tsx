import { ArrowRight, Check, Compass } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { featureGroups, featurePath } from "../components/features";
import { Empty, Notice } from "../components/Layout";
import { illustration } from "../data/assets";
import { useStore } from "../data/store";

export function FeaturePage() {
  const { id } = useParams();
  const { user, authLoading } = useStore();
  if (authLoading)
    return (
      <main id="main" className="wrap section">
        <Notice>Checking your session…</Notice>
      </main>
    );
  if (user) return <Navigate replace to="/overview" />;
  const group = featureGroups.find((item) =>
    item.features.some((feature) => feature.id === id),
  );
  const feature = group?.features.find((item) => item.id === id);
  if (!feature || !group)
    return (
      <main id="main" className="wrap section">
        <Empty
          title="Feature not found"
          text="Choose a feature from the menu to continue."
        />
      </main>
    );
  const Icon = feature.icon;
  return (
    <main id="main" className="wrap section feature-page">
      <div className="feature-page-hero">
        <div>
          <div className="overline">
            <Icon size={19} /> {group.title}
          </div>
          <h1 className="page-title">{feature.title}</h1>
          <p className="lede">{feature.description}</p>
          <Link
            className="btn primary"
            to={
              ["program-guide", "opportunity-hub"].includes(feature.id)
                ? feature.route
                : "/sign-in?next=" + encodeURIComponent(feature.route)
            }
          >
            {feature.id === "opportunity-hub"
              ? "Browse opportunities"
              : feature.id === "program-guide"
                ? "Open course guide"
                : "Sign in to continue"}
            <ArrowRight size={17} />
          </Link>
        </div>
        <img src={illustration(group.image)} alt="" />
      </div>
      <section className="feature-instructions">
        <h2>How it works</h2>
        <ol>
          {feature.steps.map((step) => (
            <li key={step}>
              <Check size={19} />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="feature-example">
        <div>
          <h2>In practice</h2>
          <p>{feature.example}</p>
        </div>
        <div>
          <h2>What you get</h2>
          <p>{feature.result}</p>
        </div>
      </section>
      <nav aria-label="Related features" className="feature-related">
        <h2>
          <Compass size={19} /> Explore related features
        </h2>
        {group.features
          .filter((item) => item.id !== id)
          .map((item) => (
            <Link to={featurePath(item.id)} key={item.id}>
              {item.title}
              <ArrowRight size={15} />
            </Link>
          ))}
      </nav>
    </main>
  );
}
