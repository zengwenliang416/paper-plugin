import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const casesPath = join(here, "..", "tests", "routing-cases.json");
const cases = JSON.parse(readFileSync(casesPath, "utf8"));

const rules = [
  {
    skill: "paper-reader",
    re: /(pdf|精读|双语|原文锚点|source anchor|图表.*原文|阅读)/i,
  },
  {
    skill: "paper-docx-repair",
    re: /(docx|word|wps|目录|页码|三线表|公式编号|ooxml|渲染|封面|行距|页眉|页脚)/i,
  },
  {
    skill: "paper-literature",
    re: /(参考文献|文献.*真实|引用|doi|crossref|cnki|万方|gb\/t|7714|bibtex|ris|文末|\[\d|\[[\d,\-\s]+\])/i,
  },
  {
    skill: "paper-figure",
    re: /(截图|照片|cad|dwg|dxf|仿真|图表|ai 生成|ai生成|运行图|测试图|证据来源|图\s*\d)/i,
  },
  {
    skill: "paper-paper2ppt",
    re: /(答辩|ppt|pptx|幻灯片|讲稿|视频页|视频|演示|图片预留)/i,
  },
  {
    skill: "paper-response",
    re: /(审稿人|reviewer|response letter|rebuttal|返修|回复审稿|编辑意见)/i,
  },
  {
    skill: "paper-data",
    re: /(数据可用性|data availability|fair|仓库|repository|accession|identifier|代码仓库说明)/i,
  },
  {
    skill: "paper-manuscript-writing",
    re: /(论文项目|正文|开题|综述|降重|aigc|润色|质量闸门|材料|文件夹|写作|改写|初稿|终稿|上下文|当前版本|继续.*论文|claim ledger|evidence ledger|source-of-truth|checkpoint)/i,
  },
];

function classify(input) {
  const text = input.toLowerCase();
  const outOfScope = [];
  if (/(后端|前端|bug|mysql|docker|端口|部署|启动不起来|登录)/i.test(input)) {
    if (/(证据|论文|运行手册|截图|交付)/i.test(input)) {
      outOfScope.push("project-packaging");
    } else {
      if (/(bug|登录|后端|前端)/i.test(input)) outOfScope.push("software-repair");
      if (/(mysql|docker|端口|部署|启动不起来)/i.test(input)) outOfScope.push("environment-setup");
      return { primary: "out-of-scope", supporting: [], outOfScope };
    }
  }

  if (/(论文.*源码|源码.*论文|一起交付|项目源码|运行手册|答辩材料|运行截图.*答辩材料)/i.test(input)) {
    return {
      primary: "paper-workflow-router",
      supporting: [
        "paper-manuscript-writing",
        "paper-docx-repair",
        "paper-paper2ppt",
      ],
      outOfScope: ["project-packaging"],
    };
  }

  const matched = [];
  for (const rule of rules) {
    if (rule.re.test(input) || rule.re.test(text)) matched.push(rule.skill);
  }
  const primary = matched[0] ?? "paper-workflow-router";
  let supporting = matched.slice(1);

  if (primary !== "paper-manuscript-writing") {
    supporting = supporting.filter((skill) => skill !== "paper-manuscript-writing");
  }
  if (primary === "paper-reader") {
    supporting = supporting.filter((skill) => skill !== "paper-figure");
  }

  if (primary === "paper-response" && /(证据|实验|补)/i.test(input)) {
    supporting.push("paper-manuscript-writing");
  }

  return {
    primary,
    supporting: [...new Set(supporting)],
    outOfScope,
  };
}

function sameSet(actual, expected) {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

let failed = false;
for (const testCase of cases) {
  const actual = classify(testCase.input);
  const ok =
    actual.primary === testCase.primary &&
    sameSet(actual.supporting, testCase.supporting) &&
    sameSet(actual.outOfScope, testCase.outOfScope);

  if (!ok) {
    failed = true;
    console.error(`FAIL: ${testCase.name}`);
    console.error(`  expected ${JSON.stringify({
      primary: testCase.primary,
      supporting: testCase.supporting,
      outOfScope: testCase.outOfScope,
    })}`);
    console.error(`  actual   ${JSON.stringify(actual)}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Router contract passed for ${cases.length} cases.`);
