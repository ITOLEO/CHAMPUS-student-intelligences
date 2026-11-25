import { Check, Flag, Layers, Circle, Target, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";

export function LearningMilestones() {
  const s = useStore();
  const verified = new Set(
    s.evidence
      .filter((work) =>
        work.reviews.some((review) => review.decision === "Verified"),
      )
      .map((work) => work.indicator_id),
  );
  const milestones = [
    {
      title: "Set a learning goal",
      count: s.profile.goals.trim() ? 1 : 0,
      icon: Target,
      to: "/profile",
    },
    {
      title: "Complete a practice resource",
      count: s.completed.length,
      icon: Layers,
      to: "/skills",
    },
    {
      title: "Submit evidence",
      count: s.evidence.length,
      icon: Flag,
      to: "/skills",
    },
    {
      title: "Demonstrate a verified skill",
      count: verified.size,
      icon: Trophy,
      to: "/plan",
    },
  ];
  const stepsDone = milestones.filter((item) => item.count > 0).length;
  const next = milestones.find((item) => !item.count);
  return (
    <section className="panel milestones" aria-labelledby="milestones-title">
      <div className="milestones-heading">
        <div>
          <div className="overline">
            <Trophy size={15} /> Learning journey
          </div>
          <h2 id="milestones-title">Your milestones</h2>
        </div>
        <p>
          {stepsDone} of {milestones.length} reached
        </p>
      </div>
      <progress
        aria-label="Learning milestones reached"
        max={milestones.length}
        value={stepsDone}
      />
      <ol className="milestone-grid">
        {milestones.map(({ title, count, icon: Icon, to }) => (
          <li key={title} className={count ? "reached" : ""}>
            <Icon size={20} />
            <Link to={to}>{title}</Link>
            <span>
              {count ? (
                <>
                  <Check size={14} /> Reached
                </>
              ) : title === next?.title ? (
                "Suggested next step"
              ) : (
                <>
                  <Circle size={13} /> To do
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
