import classNames from "classnames";
import Item from "components/bookmarks/item";

import { columnMap } from "../../utils/layout/columns";

export default function List({ bookmarks, layout, bookmarksStyle }) {
  const iconOnly = layout?.iconsOnly || bookmarksStyle === "icons";

  // iconsOnly: tighter grid of small icon squares (no name)
  // default (including row style): responsive card grid matching CSS breakpoints
  const classes = iconOnly
    ? "grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 bookmark-list"
    : "grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 bookmark-list";

  return (
    <ul className={classNames(classes, "mb-2", layout?.header === false ? "" : "mt-3")}>
      {bookmarks.map((bookmark) => (
        <Item
          key={`${bookmark.name}-${bookmark.href}`}
          bookmark={bookmark}
          iconOnly={iconOnly}
        />
      ))}
    </ul>
  );
}
