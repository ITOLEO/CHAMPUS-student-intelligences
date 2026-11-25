import {
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  Compass,
  GraduationCap,
  Layers,
  LayoutDashboard,
} from "lucide-react";

export const featureGroups = [
  {
    id: "industry",
    title: "Industry workspace",
    image: "venture-workshop",
    features: [
      {
        id: "industry-dashboard",
        title: "Industry Desk",
        description:
          "See what your organization has published and where to update it.",
        route: "/industry",
        icon: BriefcaseBusiness,
        steps: [
          "Review the workplace needs your organization has published.",
          "Choose a need to update or create a new one.",
          "Share each need with the institution’s teaching team.",
        ],
      },
      {
        id: "industry-needs",
        title: "Industry needs",
        description:
          "Describe real workplace needs and identify the skills they require.",
        route: "/industry",
        icon: Layers,
        steps: [
          "Describe a task workers need to perform.",
          "Choose an observable skill indicator.",
          "Publish the need for teachers to use in relevant courses.",
        ],
      },
    ],
  },
  {
    id: "teacher",
    title: "Teacher workspace",
    image: "culinary-practice",
    features: [
      {
        id: "teacher-dashboard",
        title: "Teaching Studio",
        description:
          "See industry input, course enrollments, and assigned work together.",
        route: "/teacher",
        icon: LayoutDashboard,
        steps: [
          "Review the needs published by industry partners.",
          "See which learners are enrolled in your courses.",
          "Track assigned tasks and open the review queue.",
        ],
      },
      {
        id: "course-practice",
        title: "Course practice",
        description:
          "Turn an industry need into a task aligned with a course outcome.",
        route: "/teacher",
        icon: GraduationCap,
        steps: [
          "Choose an industry need and a student from your roster.",
          "State the formal course outcome and observable skill.",
          "Assign the task and explain what evidence the student should submit.",
        ],
      },
      {
        id: "evidence-review",
        title: "Evidence review",
        description:
          "Verify student work against an indicator or request a revision.",
        route: "/staff",
        icon: BookOpen,
        steps: [
          "Open an assigned student’s evidence.",
          "Check the work against the task’s observable indicator.",
          "Verify the skill or request a focused revision.",
        ],
      },
    ],
  },
  {
    id: "student",
    title: "Student workspace",
    image: "study-plan",
    features: [
      {
        id: "student-dashboard",
        title: "Student Overview",
        description:
          "See your next action and milestones based on your real work.",
        route: "/overview",
        icon: LayoutDashboard,
        steps: [
          "Set a learning goal.",
          "See the next course action and which milestones you’ve reached.",
          "Return after submitting work to check for feedback.",
        ],
      },
      {
        id: "learning-plan",
        title: "Learning plan",
        description:
          "Follow course tasks, submit evidence, and act on feedback.",
        route: "/plan",
        icon: ClipboardList,
        steps: [
          "Open a task from your course plan.",
          "Read the outcome and follow the suggested practice.",
          "Submit evidence and revisit the task to read your teacher’s feedback.",
        ],
      },
      {
        id: "skill-development",
        title: "Skill development",
        description:
          "Practice observable skills and see which ones you can demonstrate.",
        route: "/skills",
        icon: Layers,
        steps: [
          "Choose a skill from the library.",
          "Practise the action described by its indicator.",
          "Record your practice and submit evidence for review when ready.",
        ],
      },
      {
        id: "opportunity-hub",
        title: "Opportunity Hub",
        description:
          "Check entry requirements and find where to apply your skills.",
        route: "/opportunities",
        icon: Compass,
        steps: [
          "Explore opportunities by type and deadline.",
          "Check entry conditions against the organizer’s rules.",
          "Save the opportunity or continue to the organizer’s application.",
        ],
      },
    ],
  },
];

export const featurePath = (id: string) => "/features/" + id;
