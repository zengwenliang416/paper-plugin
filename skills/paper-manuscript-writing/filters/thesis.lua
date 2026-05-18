-- Generic Chinese thesis helpers for Pandoc DOCX export.
--
-- The filter turns stable HTML markers into Word OpenXML blocks:
--   <!-- cover -->      generic thesis cover page
--   <!-- integrity -->  academic integrity declaration page
--   <!-- toc -->        dynamic Word table of contents field

local DOC_META = {}

local function meta_string(key, fallback)
  local ok, value = pcall(function()
    return DOC_META[key]
  end)
  if not ok then
    value = nil
  end
  if value == nil then
    return fallback or ""
  end
  local text = pandoc.utils.stringify(value)
  if text == "" then
    return fallback or ""
  end
  return text
end

local function meta_first(keys, fallback)
  for _, key in ipairs(keys) do
    local value = meta_string(key, "")
    if value ~= "" then
      return value
    end
  end
  return fallback or ""
end

local function xml_escape(text)
  text = text or ""
  text = text:gsub("&", "&amp;")
  text = text:gsub("<", "&lt;")
  text = text:gsub(">", "&gt;")
  return text
end

local function paragraph(text, options)
  options = options or {}
  local ppr = ""
  if options.style then
    ppr = ppr .. '<w:pStyle w:val="' .. options.style .. '"/>'
  end
  if options.align then
    ppr = ppr .. '<w:jc w:val="' .. options.align .. '"/>'
  end
  if options.page_break_before then
    ppr = ppr .. '<w:pageBreakBefore/>'
  end

  local rpr = ""
  if options.bold then
    rpr = rpr .. "<w:b/>"
  end
  if options.size then
    rpr = rpr .. '<w:sz w:val="' .. options.size .. '"/><w:szCs w:val="' .. options.size .. '"/>'
  end
  if options.font then
    rpr = rpr .. '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="' .. options.font .. '"/>'
  end

  return '<w:p><w:pPr>' .. ppr .. '</w:pPr><w:r><w:rPr>' .. rpr ..
    '</w:rPr><w:t xml:space="preserve">' .. xml_escape(text) .. '</w:t></w:r></w:p>'
end

local function blank()
  return "<w:p/>"
end

local function page_break()
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
end

local function cover_block()
  local title = meta_first({ "thesisTitle", "title" }, "论文题目")
  local subtitle = meta_first({ "thesisSubtitle", "subtitle" }, "本科毕业论文")
  local school = meta_first({ "thesisSchool", "school" }, "")
  local department = meta_first({ "thesisDepartment", "department" }, "")
  local major = meta_first({ "thesisMajor", "major" }, "")
  local author = meta_first({ "thesisAuthor", "author" }, "")
  local student_id = meta_first({ "thesisStudentId", "studentId", "student-id", "student_id" }, "")
  local advisor = meta_first({ "thesisAdvisor", "advisor" }, "")
  local date = meta_first({ "thesisDate", "date" }, "")

  local lines = {}
  if school ~= "" then
    table.insert(lines, paragraph(school, { align = "center", bold = true, font = "黑体", size = "36" }))
    table.insert(lines, blank())
  end
  table.insert(lines, paragraph(subtitle, { align = "center", bold = true, font = "黑体", size = "40" }))
  table.insert(lines, blank())
  table.insert(lines, blank())
  table.insert(lines, paragraph(title, { align = "center", bold = true, font = "黑体", size = "32" }))
  table.insert(lines, blank())
  table.insert(lines, blank())
  table.insert(lines, paragraph("学院：" .. department, { align = "center", font = "宋体", size = "28" }))
  table.insert(lines, paragraph("专业：" .. major, { align = "center", font = "宋体", size = "28" }))
  table.insert(lines, paragraph("学生姓名：" .. author, { align = "center", font = "宋体", size = "28" }))
  table.insert(lines, paragraph("学号：" .. student_id, { align = "center", font = "宋体", size = "28" }))
  table.insert(lines, paragraph("指导教师：" .. advisor, { align = "center", font = "宋体", size = "28" }))
  table.insert(lines, paragraph("日期：" .. date, { align = "center", font = "宋体", size = "28" }))
  table.insert(lines, page_break())
  return table.concat(lines, "")
end

local function integrity_block()
  local lines = {}
  table.insert(lines, paragraph("学术诚信承诺书", { align = "center", bold = true, font = "黑体", size = "32" }))
  table.insert(lines, blank())
  table.insert(lines, paragraph("本人郑重承诺：所提交的毕业论文是在指导教师指导下独立完成的研究成果。除文中已经注明引用的内容外，本文不包含他人已经发表或撰写过的研究成果。", { font = "宋体", size = "24" }))
  table.insert(lines, blank())
  table.insert(lines, paragraph("学生签名：________________", { font = "宋体", size = "24" }))
  table.insert(lines, paragraph("日期：________________", { font = "宋体", size = "24" }))
  table.insert(lines, page_break())
  return table.concat(lines, "")
end

local function toc_block()
  return table.concat({
    paragraph("目    录", { align = "center", bold = true, font = "黑体", size = "32" }),
    '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>',
    '<w:r><w:instrText xml:space="preserve">TOC \\o "1-3" \\h \\z \\u</w:instrText></w:r>',
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>',
    '<w:r><w:t>右键更新域以生成目录</w:t></w:r>',
    '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>',
    page_break()
  }, "")
end

function Pandoc(doc)
  DOC_META = doc.meta
  local blocks = {}
  for _, block in ipairs(doc.blocks) do
    if block.t == "RawBlock" and block.format == "html" and block.text:match("%<%!%-%-%s*cover%s*%-%-%>") then
      table.insert(blocks, pandoc.RawBlock("openxml", cover_block()))
    elseif block.t == "RawBlock" and block.format == "html" and block.text:match("%<%!%-%-%s*integrity%s*%-%-%>") then
      table.insert(blocks, pandoc.RawBlock("openxml", integrity_block()))
    elseif block.t == "RawBlock" and block.format == "html" and block.text:match("%<%!%-%-%s*toc%s*%-%-%>") then
      table.insert(blocks, pandoc.RawBlock("openxml", toc_block()))
    else
      table.insert(blocks, block)
    end
  end
  doc.blocks = blocks
  return doc
end
