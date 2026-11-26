// Local sample data used by the HTML interface.
window.branchlineDemo = {
  "repos": [
    {
      "name": "rover-sim",
      "description": "移动机器人仿真场景、示例与回放工具。",
      "language": "JavaScript",
      "tone": "purple",
      "updated": "12 minutes ago",
      "commit": {
        "author": "linan",
        "message": "补充坡道场景的相机预设",
        "hash": "4f89a2d"
      },
      "files": [
        {
          "path": ".github/ISSUE_TEMPLATE/bug_report.md",
          "text": "# Bug report\n\nDescribe the issue, steps to reproduce, and the expected behavior.",
          "note": "Add issue templates"
        },
        {
          "path": "README.md",
          "text": "# Rover Sim\n\nA lightweight robotics simulation and replay toolkit. Built by **Polar Lab**, for experiments that are easy to run, inspect, and share.\n\n## Overview\n\nRover Sim brings scene configuration, frame-by-frame playback, and experiment notes into one small workspace.\n\n- Browse and configure simulation scenes\n- Step through recorded trajectories, one frame at a time\n- Compare experiments with a shared set of camera presets\n- Keep documentation alongside the code\n\n## Project structure\n\n```text\n.github/     Issue templates\ndocs/        Guides and experiment notes\nexamples/    Small, self-contained examples\nscenes/      Simulation scene configurations\nsrc/         Replay and simulation utilities\n```\n\n## Documentation\n\nStart with `docs/replay.md` for the playback guide. Scene configuration is in `scenes/ramp.json`, and the minimal replay example is in `examples/basic.js`.\n\n## Contributing\n\nOpen an issue to share a bug report or an idea. Keep changes focused and include a short explanation with your pull request.\n\n## License\n\nReleased under the MIT license. See `LICENSE` for details.",
          "note": "更新场景索引"
        },
        {
          "path": "docs/replay.md",
          "text": "# 回放说明\n\n选择场景后，可使用时间轴逐帧检查轨迹。",
          "note": "记录回放流程"
        },
        {
          "path": "scenes/ramp.json",
          "text": "{\n  \"name\": \"ramp-demo\",\n  \"camera\": \"follow\",\n  \"playbackSpeed\": 1\n}",
          "note": "补充坡道场景的相机预设"
        },
        {
          "path": "src/replay.js",
          "text": "export function createReplay(frames) {\n  let cursor = 0;\n\n  return {\n    current: () => frames[cursor] ?? null,\n    next: () => {\n      cursor = Math.min(cursor + 1, Math.max(0, frames.length - 1));\n      return frames[cursor] ?? null;\n    },\n    reset: () => { cursor = 0; },\n  };\n}",
          "note": "加入逐帧回放"
        },
        {
          "path": ".gitignore",
          "text": "node_modules/\ndist/\nreplays/",
          "note": "整理临时文件规则"
        },
        {
          "path": "package.json",
          "text": "{\n  \"name\": \"rover-sim\",\n  \"type\": \"module\",\n  \"private\": true\n}",
          "note": "初始化示例工程"
        },
        {
          "path": "LICENSE",
          "text": "MIT License\n\nCopyright (c) 2026 Polar Lab\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.",
          "note": "Add MIT license"
        },
        {
          "path": "examples/basic.js",
          "text": "import { createReplay } from '../src/replay.js';\n\nconst replay = createReplay([{ x: 0 }, { x: 1 }, { x: 2 }]);\nconsole.log(replay.current());\nconsole.log(replay.next());",
          "note": "Add a minimal replay example"
        }
      ],
      "branches": {
        "feature/replay": {
          "commit": {
            "author": "linan",
            "message": "添加标记功能说明",
            "hash": "db7c102"
          },
          "files": [
            {
              "path": "docs/markers.md",
              "text": "# 回放标记\n\n在时间轴上标出需要复查的帧。",
              "note": "添加标记功能说明"
            }
          ]
        },
        "docs/setup": {
          "commit": {
            "author": "momo",
            "message": "整理环境准备清单",
            "hash": "b59ea36"
          },
          "files": [
            {
              "path": "docs/setup.md",
              "text": "# 环境准备\n\n安装 Node.js 后，在浏览器中打开预览。",
              "note": "整理环境准备清单"
            }
          ]
        }
      }
    },
    {
      "name": "telemetry-kit",
      "description": "日志采集、CSV 转换与数据检查工具。",
      "language": "Python",
      "tone": "mint",
      "updated": "38 minutes ago",
      "commit": {
        "author": "yuchen",
        "message": "统一日志时间戳格式",
        "hash": "12c4a7e"
      },
      "files": [
        {
          "path": "README.md",
          "text": "# Telemetry Kit\n\n将本地日志转换成便于检查的 CSV 表格。",
          "note": "补充项目说明"
        },
        {
          "path": "tools/convert.py",
          "text": "import csv\n\n\ndef write_samples(path, samples):\n    with open(path, \"w\", encoding=\"utf-8\", newline=\"\") as stream:\n        writer = csv.writer(stream)\n        writer.writerow([\"timestamp\", \"value\"])\n        writer.writerows(samples)",
          "note": "统一日志时间戳格式"
        },
        {
          "path": "examples/demo.csv",
          "text": "timestamp,value\n0.00,5.2\n0.10,5.3\n0.20,5.1",
          "note": "添加示例日志"
        },
        {
          "path": "LICENSE",
          "text": "MIT License\n\nCopyright (c) 2026 Polar Lab\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.",
          "note": "Add MIT license"
        }
      ],
      "branches": {
        "feature/export": {
          "commit": {
            "author": "yuchen",
            "message": "说明导出选项",
            "hash": "58b29ff"
          },
          "files": [
            {
              "path": "docs/export.md",
              "text": "# 导出\n\n默认使用 UTF-8 编码。",
              "note": "说明导出选项"
            }
          ]
        }
      }
    },
    {
      "name": "lab-docs",
      "description": "团队手册、设备借用与实验记录。",
      "language": "Markdown",
      "tone": "blue",
      "updated": "2 hours ago",
      "commit": {
        "author": "momo",
        "message": "更新实验记录模板",
        "hash": "9b10c3a"
      },
      "files": [
        {
          "path": "README.md",
          "text": "# Polar Lab 手册\n\n记录团队协作流程和实验台使用约定。",
          "note": "补充手册索引"
        },
        {
          "path": "handbook/log-template.md",
          "text": "# 实验记录\n\n目标\n环境\n操作步骤\n结果",
          "note": "更新实验记录模板"
        },
        {
          "path": "handbook/equipment.md",
          "text": "# 设备借用\n\n登记借用人、归还时间与设备状态。",
          "note": "补充借用登记说明"
        },
        {
          "path": "LICENSE",
          "text": "MIT License\n\nCopyright (c) 2026 Polar Lab\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.",
          "note": "Add MIT license"
        }
      ],
      "branches": {}
    },
    {
      "name": "bench-fixtures",
      "description": "实验台夹具清单和装配资料。",
      "language": "Markdown",
      "tone": "amber",
      "updated": "yesterday",
      "commit": {
        "author": "linan",
        "message": "更新夹具版本清单",
        "hash": "534a0cd"
      },
      "files": [
        {
          "path": "README.md",
          "text": "# Bench Fixtures\n\n查看实验台用夹具的图纸版本和装配说明。",
          "note": "更新夹具版本清单"
        },
        {
          "path": "parts/inventory.csv",
          "text": "id,name,revision\n01,base plate,B\n02,sensor bracket,A",
          "note": "补充夹具清单"
        },
        {
          "path": "LICENSE",
          "text": "MIT License\n\nCopyright (c) 2026 Polar Lab\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.",
          "note": "Add MIT license"
        }
      ],
      "branches": {}
    }
  ],
  "tickets": [
    {
      "repo": "rover-sim",
      "kind": "issues",
      "id": 23,
      "title": "回放暂停后还会推进一帧",
      "author": "momo",
      "state": "open",
      "updated": "25 分钟前",
      "body": "暂停后拖动时间轴，松开光标时偶尔额外前进一帧。希望暂停状态下只显示选中帧。"
    },
    {
      "repo": "rover-sim",
      "kind": "issues",
      "id": 21,
      "title": "为场景列表增加地形筛选",
      "author": "linan",
      "state": "open",
      "updated": "1 小时前",
      "body": "按坡道、平地和台阶筛选场景，便于比较同组数据。"
    },
    {
      "repo": "telemetry-kit",
      "kind": "issues",
      "id": 18,
      "title": "大文件导出时显示处理进度",
      "author": "yuchen",
      "state": "open",
      "updated": "38 分钟前",
      "body": "当前导出较大日志时只能等到转换结束。建议显示已处理行数。"
    },
    {
      "repo": "telemetry-kit",
      "kind": "issues",
      "id": 14,
      "title": "保留原始采样时间列",
      "author": "linan",
      "state": "open",
      "updated": "昨天",
      "body": "CSV 导出时保留设备侧原始时间，方便排查时钟差异。"
    },
    {
      "repo": "lab-docs",
      "kind": "issues",
      "id": 9,
      "title": "补充新成员的开发环境指南",
      "author": "momo",
      "state": "open",
      "updated": "2 小时前",
      "body": "整理常用开发工具、团队目录结构和首次运行示例的步骤。"
    },
    {
      "repo": "bench-fixtures",
      "kind": "issues",
      "id": 4,
      "title": "核对夹具清单中的旧版本",
      "author": "linan",
      "state": "open",
      "updated": "昨天",
      "body": "检查清单里已归档的夹具并标明替代版本。"
    },
    {
      "repo": "rover-sim",
      "kind": "issues",
      "id": 17,
      "title": "刷新后保留上次选择的场景",
      "author": "yuchen",
      "state": "closed",
      "updated": "昨天",
      "body": "已将场景选择保存在浏览器中。"
    },
    {
      "repo": "rover-sim",
      "kind": "pulls",
      "id": 24,
      "title": "增加回放时间轴标记",
      "author": "linan",
      "state": "open",
      "updated": "12 分钟前",
      "body": "在时间轴上增加可跳转的帧标记，用于对照实验记录。",
      "branch": "feature/replay"
    },
    {
      "repo": "telemetry-kit",
      "kind": "pulls",
      "id": 17,
      "title": "整理 CSV 导出选项",
      "author": "yuchen",
      "state": "open",
      "updated": "57 分钟前",
      "body": "给导出命令增加列名和分隔符配置，并更新示例文件。",
      "branch": "feature/export"
    },
    {
      "repo": "rover-sim",
      "kind": "pulls",
      "id": 20,
      "title": "补齐本地启动说明",
      "author": "momo",
      "state": "open",
      "updated": "3 小时前",
      "body": "补充运行时版本和浏览器预览步骤。",
      "branch": "docs/setup"
    },
    {
      "repo": "lab-docs",
      "kind": "pulls",
      "id": 8,
      "title": "更新实验记录模板",
      "author": "momo",
      "state": "closed",
      "updated": "2 小时前",
      "body": "统一实验记录中的目标、环境、步骤和结果。"
    }
  ],
  "activity": [
    {
      "repo": "rover-sim",
      "kind": "pulls",
      "id": 24,
      "verb": "发起合并请求",
      "tone": "purple"
    },
    {
      "repo": "telemetry-kit",
      "kind": "issues",
      "id": 18,
      "verb": "新建议题",
      "tone": "mint"
    },
    {
      "repo": "lab-docs",
      "kind": "pulls",
      "id": 8,
      "verb": "合并了改动",
      "tone": "blue"
    },
    {
      "repo": "bench-fixtures",
      "kind": "issues",
      "id": 4,
      "verb": "新建议题",
      "tone": "amber"
    }
  ]
};
