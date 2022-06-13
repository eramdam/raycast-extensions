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

interface Item {
  id: string;
  filename: string;
  path: string;
  keywords: string[];
}

export default function Command() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [searchText, setSearchText] = useState("");

  const searchItems = useRef<Fuse<Item>>(
    new Fuse([], {
      threshold: 0.4,
      includeScore: true,
      keys: ["keywords", "filename", "id"],
    })
  );

  useEffect(() => {
    const { folder } = getPreferenceValues();
    const home = os.homedir();
    const normalizedPath = String(folder).replace(/^~/, home);
    glob("*.{png,gif,jpeg,jpg,webp}", {
      cwd: normalizedPath,
      absolute: true,
    }).then((files) => {
      const newItems = files.map((f) => {
        return {
          id: f,
          path: f,
          filename: path.basename(f),
          keywords: path
            .basename(f, f.split(".").pop())
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
      return _(searchItems.current.search(searchText.trim()))
        .uniqBy((r) => r.item.id)
        .sortBy((r) => r.refIndex)
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
                <Action
                  title="Copy to clipboard"
                  onAction={() => {
                    runAppleScript(`set the clipboard to POSIX file "${item.path}"`).then(() => {
                      popToRoot();
                      closeMainWindow();
                      showHUD("Copied image to clipboard");
                    });
                  }}
                  icon={Icon.Clipboard}
                ></Action>
                <Action.Open title="Open" target={item.path} />
                <Action.ShowInFinder path={item.path} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
