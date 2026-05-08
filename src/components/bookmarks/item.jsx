import classNames from "classnames";
import ResolvedIcon from "components/resolvedicon";
import { useContext } from "react";
import { SettingsContext } from "utils/contexts/settings";

export default function Item({ bookmark, iconOnly = false }) {
  const description = bookmark.description ?? new URL(bookmark.href).hostname;
  const { settings } = useContext(SettingsContext);

  return (
    <li
      key={bookmark.name}
      id={bookmark.id}
      className={classNames("bookmark", iconOnly && "grid")}
      data-name={bookmark.name}
    >
      <a
        href={bookmark.href}
        title={bookmark.name}
        rel="noreferrer"
        target={bookmark.target ?? settings.target ?? "_blank"}
        className={classNames(
          settings.cardBlur !== undefined && `backdrop-blur${settings.cardBlur.length ? "-" : ""}${settings.cardBlur}`,
          "text-left cursor-pointer transition-all rounded-md font-medium text-theme-700 dark:text-theme-200 dark:hover:text-theme-300 shadow-md shadow-theme-900/10 dark:shadow-theme-900/20 bg-theme-100/20 hover:bg-theme-300/20 dark:bg-white/5 dark:hover:bg-white/10",
          iconOnly ? "h-[60px] w-[60px] grid" : "flex flex-col items-center justify-center gap-1 p-2 rounded-xl w-full aspect-[4/3]",
        )}
      >
        {iconOnly ? (
          <div className="flex items-center justify-center text-theme-700 hover:text-theme-700 dark:text-theme-200 text-xl font-medium rounded-md bookmark-icon py-0.5">
            {bookmark.icon && (
              <div className="w-7 h-7">
                <ResolvedIcon icon={bookmark.icon} alt={bookmark.abbr} />
              </div>
            )}
            {!bookmark.icon && bookmark.abbr}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center bookmark-icon">
              {bookmark.icon ? (
                <div className="w-10 h-10 shrink-0">
                  <ResolvedIcon icon={bookmark.icon} alt={bookmark.abbr} />
                </div>
              ) : (
                <span className="text-base font-medium">{bookmark.abbr}</span>
              )}
            </div>
            <span className="text-xs text-center truncate w-full bookmark-name leading-tight mt-1">
              {bookmark.name}
            </span>
          </>
        )}
      </a>
    </li>
  );
}
