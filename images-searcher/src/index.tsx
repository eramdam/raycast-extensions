import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Grid,
  Icon,
  popToRoot,
  showHUD,
} from "@raycast/api";
import Fuse from "fuse.js";
import _ from "lodash";

import os from "os";
import path from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import { runAppleScript } from "run-applescript";
import glob from "tiny-glob";

const extensions = ["png", "gif", "jpeg", "jpg"] as const;

interface Item {
  id: string;
  filename: string;
  path: string;
  keywords: string[];
  extension: typeof extensions[number];
}

export default function Command() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [searchText, setSearchText] = useState("");

  const searchItems = useRef<Fuse<Item>>(
    new Fuse([], {
      minMatchCharLength: 2,
      includeScore: true,
      isCaseSensitive: false,
      keys: ["keywords", "title"],
    })
  );

  useEffect(() => {
    const { folder } = getPreferenceValues();
    const home = os.homedir();
    const normalizedPath = String(folder).replace(/^~/, home);
    glob(`*.{${[...extensions, ...extensions.map((i) => i.toUpperCase())].join(",")}}`, {
      cwd: normalizedPath,
      absolute: true,
    }).then((files) => {
      const newItems = files.map((f) => {
        return {
          id: f,
          path: f,
          extension: path.extname(f).replace(/^\./, "").toLowerCase() as typeof extensions[number],
          filename: path.basename(f),
          title: path.basename(f).toLowerCase(),
          keywords: path
            .basename(f.toLowerCase(), f.split(".").pop())
            .split(/[^a-z0-9]/i)
            .filter((i) => !!i),
        };
      });

      setItems(newItems);

      newItems.forEach((item) => {
        searchItems.current.add(item);
      });
    });
  }, []);

  const filteredItems = useMemo(() => {
    if (searchText.trim()) {
      return _(searchItems.current.search(searchText.toLowerCase().trim()))
        .map((r) => r.item)
        .value();
    }

    return items || [];
  }, [searchText, items]);

  return (
    <Grid itemSize={Grid.ItemSize.Medium} onSearchTextChange={setSearchText} isLoading={items === null}>
      {filteredItems.map((item) => {
        return (
          <Grid.Item
            content={item.path}
            key={item.path}
            title={item.filename}
            keywords={item.keywords}
            actions={
              <ActionPanel>
                {item.extension !== "gif" && (
                  <Action
                    title="Copy to clipboard"
                    onAction={() => {
                      runAppleScript(`set the clipboard to (read (POSIX file "${item.path}") as TIFF picture)`).then(
                        () => {
                          popToRoot();
                          closeMainWindow();
                          showHUD(`Copied ${item.filename} to clipboard`);
                        }
                      );
                    }}
                    icon={Icon.Clipboard}
                  ></Action>
                )}
                <Action.ShowInFinder path={item.path} />
                <Action.Open title="Open" target={item.path} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
