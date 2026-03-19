import { WebSearch } from 'coze-coding-dev-sdk'
import { LLM } from 'coze-coding-dev-sdk'
import { writeFileSync, readFileSync } from 'fs'

interface NewsItem {
  title: string
  url: string
  source: string
  publishTime: string
  summary: string
  category: string
}

const CATEGORIES = [
  '战略与业务',
  '产品与技术',
  '市场与销量',
  '公关与ESG',
  '行业环境'
]

async function main() {
  console.log('🚀 开始抓取丰田新闻...')
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)

  const searchResults = await WebSearch.search({
    query: '丰田 中国 新闻 动态',
    limit: 20
  })

  console.log(`✅ 找到 ${searchResults.results?.length || 0} 条新闻`)

  if (!searchResults.results || searchResults.results.length === 0) {
    console.log('⚠️ 未找到新闻，退出')
    return
  }

  const categorizedNews: Record<string, NewsItem[]> = {
    '战略与业务': [],
    '产品与技术': [],
    '市场与销量': [],
    '公关与ESG': [],
    '行业环境': []
  }

  for (const item of searchResults.results) {
    try {
      console.log(`  - 分析: ${item.title}`)

      const categoryResult = await LLM.chat({
        messages: [
          {
            role: 'system',
            content: `你是丰田新闻分类专家。请根据以下分类维度对新闻进行分类：
${CATEGORIES.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')}

请只返回分类名称，不要其他内容。`
          },
          {
            role: 'user',
            content: `新闻标题: ${item.title}\n新闻摘要: ${item.snippet || ''}\n\n请选择最合适的分类：`
          }
        ],
        model: 'deepseek-chat'
      })

      const category = categoryResult.content.trim() || '行业环境'
      categorizedNews[category] = categorizedNews[category] || []
      categorizedNews[category].push({
        title: item.title,
        url: item.url,
        source: new URL(item.url).hostname,
        publishTime: item.publishedAt || new Date().toISOString(),
        summary: item.snippet || '',
        category
      })
    } catch (error) {
      console.error(`  ❌ 分析失败: ${item.title}`, error)
      categorizedNews['行业环境'].push({
        title: item.title,
        url: item.url,
        source: new URL(item.url).hostname,
        publishTime: item.publishedAt || new Date().toISOString(),
        summary: item.snippet || '',
        category: '行业环境'
      })
    }
  }

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  let markdown = `# 丰田中国动态简报\n\n`
  markdown += `📅 ${today}\n\n`
  markdown += `> 本简报由 AI 自动生成，每天早上 8:30 更新\n\n`
  markdown += `---\n\n`

  for (const category of CATEGORIES) {
    const newsList = categorizedNews[category]
    if (!newsList || newsList.length === 0) continue

    markdown += `## ${category}\n\n`

    newsList.forEach((item, index) => {
      markdown += `### ${index + 1}. ${item.title}\n\n`
      markdown += `**来源**：[${item.source}](${item.url})\n\n`
      markdown += `**摘要**：${item.summary}\n\n`
      markdown += `**发布时间**：${new Date(item.publishTime).toLocaleString('zh-CN')}\n\n`
      markdown += `---\n\n`
    })
  }

  markdown += `\n## 📊 统计\n\n`
  markdown += `- **总新闻数**：${Object.values(categorizedNews).flat().length} 条\n`
  markdown += `- **战略与业务**：${categorizedNews['战略与业务']?.length || 0} 条\n`
  markdown += `- **产品与技术**：${categorizedNews['产品与技术']?.length || 0} 条\n`
  markdown += `- **市场与销量**：${categorizedNews['市场与销量']?.length || 0} 条\n`
  markdown += `- **公关与ESG**：${categorizedNews['公关与ESG']?.length || 0} 条\n`
  markdown += `- **行业环境**：${categorizedNews['行业环境']?.length || 0} 条\n`

  const fileName = `toyota-news-${new Date().toISOString().split('T')[0]}.md`
  writeFileSync(fileName, markdown, 'utf-8')
  console.log(`✅ 文档已保存: ${fileName}`)

  try {
    let readmeContent = ''
    try {
      readmeContent = readFileSync('README.md', 'utf-8')
    } catch (error) {
      readmeContent = `# 丰田中国动态简报\n\n> 本仓库由 AI 自动维护，每天早上 8:30 更新\n\n`
    }

    const newLink = `- [${today}](${fileName})`

    if (readmeContent.includes('## 最新简报')) {
      readmeContent = readmeContent.replace(
        /## 最新简报\n\n([\s\S]*?)(?=\n##|$)/,
        `## 最新简报\n\n${newLink}`
      )
    } else {
      readmeContent += `\n## 最新简报\n\n${newLink}\n`
    }

    writeFileSync('README.md', readmeContent, 'utf-8')
    console.log('✅ README 已更新')
  } catch (error) {
    console.error('❌ 更新 README 失败:', error)
  }

  console.log('\n🎉 完成！')
}

main().catch(console.error)
