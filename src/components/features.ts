import {
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  Compass,
  GraduationCap,
  Layers,
} from "lucide-react";

export const featureGroups = [
  {
    title: "Student workspace",
    features: [
      {
        id: "learning-plan",
        title: "Learning plan",
        description:
          "Follow course tasks, submit evidence and act on feedback.",
        icon: ClipboardList,
      },
      {
        id: "skill-development",
        title: "Skill development",
        description:
          "Practice observable skills and see which ones you can demonstrate.",
        icon: Layers,
      },
      {
        id: "opportunity-hub",
        title: "Opportunity hub",
        description:
          "Check entry requirements and find where to apply your skills.",
        icon: Compass,
      },
    ],
  },
  {
    title: "Teacher workspace",
    features: [
      {
        id: "course-practice",
        title: "Course practice",
        description:
          "Turn an industry need into a task aligned with a course outcome.",
        icon: GraduationCap,
      },
      {
        id: "evidence-review",
        title: "Evidence review",
        description:
          "Verify student work against an indicator or ask for a revision.",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Industry workspace",
    features: [
      {
        id: "industry-needs",
        title: "Industry needs",
        description:
          "Publish current workplace needs and identify the capabilities they require.",
        icon: BriefcaseBusiness,
      },
    ],
  },
];
