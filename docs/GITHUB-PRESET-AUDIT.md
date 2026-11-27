# GitHub preset audit · 2026-11-28

Budget: 10 work rounds. Baseline: `04e5e84`. Only the dedicated
`codex/github-preset` checkout is used; the saved workspace preset remains available.

## Reference evidence

Read the live public GitHub repository `https://github.com/primer/react`, its
branch/tag selector, Issues and Pull requests, and the public profile
`https://github.com/lulunomaro` in the built-in browser on 2026-11-28.
GitHub was signed out. Authenticated Dashboard and account settings cannot be
claimed as a direct pixel comparison; their shared components follow the visible
repository/profile UI and official Primer patterns.

Observed: 32px controls; 40–41px file rows; Mona Sans body text; repository tabs,
branch/tag tabs, search and default-branch badge; profile cards with right-aligned
visibility and fork metadata; Issues with a filter sidebar and searchable state
controls; PR state filters and compact metadata.

## Work rounds

| Round | Scope | Status / evidence |
| --- | --- | --- |
| 1 | Reference and source inventory | Complete. Found inconsistent menus/avatars, missing tag navigation, branch counts displayed as fork metadata, old HTML-preview wording, incomplete issue filtering. |
| 2 | Global header, typography and drawers | Complete. Local OFL Mona Sans; matching identicons; modal left/right drawers, logout and keyboard focus across business pages. |
| 3 | Dashboard and feed interaction | Complete. Following stays in the activity feed; full sidebar repository search; empty repositories and unknown Git authors are represented accurately. |
| 4 | Profiles, Stars, follows and contribution calendar | Complete. Correct card metadata, own-profile pin controls, year picker and Shanghai author-date/year boundaries. |
| 5 | Repository, file tree, branches and tags | Complete. Branch/tag tabs, annotated/lightweight tags, explicit tag refs, keyboard selection, real commit and watcher counts, file headings, collapsible tree and right-hand About panel. |
| 6 | Issues and PR states/navigation | Complete. Issue sidebar, search/author/state/sort/density, explicit global issue repository choice; album PR counts, state filtering and direct review links. |
| 7 | Account and repository settings | Complete. Preset/profile settings verified; Wiki and Pulse load actual data on direct entry; Actions/security states no longer claim this live NAS is an HTML preview. |
| 8 | Album, procurement and administration | Complete. Shared header/drawers and controls reviewed in the built-in browser. Existing date/person procurement and album review workflows retained. |
| 9 | Keyboard, mobile and regression verification | Complete. Real browser flows pass at 320px and 390px across repo/issues/PRs/album/procurement/admin; no document overflow or JavaScript errors. |
| 10 | NAS release, live verification and Git delivery | Complete. Staged against the actual current NAS release; 5 NAS tests passed. Activated, verified assets and Feishu gates; delivery is the commit containing this record. |

## Intentional and remaining differences

- Gitpolar branding and Feishu-only production login are intentional.
- CAD preview/Git Graph, albums, procurement/inventory and NAS administration are
  Gitpolar features without corresponding GitHub pages; use the shared design
  language without removing their workflows.
- GitHub Actions runners, repository forks, code scanning and general code PR
  review are not implemented by this preset audit. Existing album PR review and
  branch/CAD comparison remain functional. Unsupported services must be described
  accurately rather than presented as working GitHub services.

Final validation and release evidence will be recorded below.

## Detailed limits

- Profile images remain Gitpolar identicons. Profile tabs omit GitHub Packages,
  and account settings expose the settings supported by this instance. Notifications
  are issue/PR activity, without GitHub notification delivery/read-state semantics.
- The contribution calendar uses the selected calendar year rather than GitHub's
  default trailing year. Counts scan up to 8,000 reachable commits per repository,
  attribute author identity by the instance's known names/emails and group days
  in Asia/Shanghai. The year selector offers the latest five years; older years
  can be selected with `?year=YYYY`.
- Following includes issue/album authors and updates to repositories owned by
  followed teammates; it is not GitHub's recommendation service.
- Branch management uses existing dialogs. Native code PR discussions, reviews,
  fork networks, CI runners, code scanning, issue assignees/labels/comments and
  advanced GitHub Projects are outside the current implementation.
- NAS albums/procurement/admin retain their own workflows and page structure
  inside the GitHub preset shell. These are not GitHub product pages.

## Verification

- `tests/interface-workspace.e2e.py`: real HTTP/session/profile/pins, original
  preset restoration, themes, Following, branch/tag keyboard navigation, year
  selection, issue filters/repository choice, account drawers, six mobile routes
  at 320/390px; no JavaScript errors or document horizontal overflow.
- `tests/album-workspace.e2e.py`: actual upload, owner review/merge, personal and
  shared Star counts, selection, bulk annotation and mobile panels.
- `tests/github-preset-audit.test.mjs`: lightweight/annotated tags, branch/tag name
  collision, immutable tag browsing, Shanghai year boundaries for authored Git
  commits and issues, webfont bytes and CSP.
- Full final test output and deployment receipts are kept in the task's ignored
  artifact folder, alongside desktop/mobile screenshots.

Final results on 2026-11-28: **69 tests passed, 0 failed, 0 skipped** in the
full Node suite; **5 passed, 0 skipped** in the NAS candidate gate. Both browser
regression scripts passed, including the direct Dashboard-to-album-PR review
link and desktop login footer. The built-in browser verified the deployed
Feishu-only login and the live preset/font. All 18 release files and 5 public
HTTP assets were compared with the reviewed overlay; the variable font was
verified byte-for-byte (137,252 bytes).

Production build: `4346c86cc1941eba`, `updateAvailable: false`. Activation keeps
a SQLite backup on HDD2 and an automatic rollback path. The existing activity
album remained at **776 photos / 58 activities** with the same Git head. The
original preset CSS and authentication/workbench/Feishu modules were preserved.
No authenticated GitHub dashboard or GitHub account settings session was
available; those remain a component/layout comparison, not a certified
pixel-for-pixel reproduction of every authenticated GitHub variant.
