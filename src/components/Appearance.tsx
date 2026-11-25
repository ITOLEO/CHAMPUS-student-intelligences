import { Monitor, Moon, Sun } from "lucide-react";
import { setting, saveSetting } from "../data/appearance";

export const railModes = [
  { id: "expanded", label: "Expanded" },
  { id: "collapsed", label: "Collapsed" },
  { id: "hover", label: "Expand on hover" },
];

export function ThemeChoices({ preview = false }: { preview?: boolean }) {
  const selected = setting("theme", "light");
  const choices = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];
  return (
    <div
      className={preview ? "theme-cards" : "theme-choices"}
      role="group"
      aria-label="Color theme"
    >
      {choices.map(({ id, label, icon: Icon }) => (
        <button
          type="button"
          aria-pressed={id === selected}
          key={id}
          onClick={() => saveSetting("theme", id)}
        >
          {preview && (
            <span
              className={"theme-preview theme-preview-" + id}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>
          )}
          <span className="theme-label">
            <Icon size={15} /> {label}
          </span>
        </button>
      ))}
    </div>
  );
}
