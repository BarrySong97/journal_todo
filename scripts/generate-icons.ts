/**
 * 图标生成脚本
 * 从 icon.png 生成 32x32, 128x128, 128x128@2x 规格的图标
 *
 * 使用方法:
 * 1. 安装依赖: pnpm add -D sharp @types/node
 * 2. 运行脚本: npx tsx scripts/generate-icons.ts
 */

import sharp from "sharp"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ICONS_DIR = path.resolve(__dirname, "../packages/desktop/src-tauri/icons")
const SOURCE_ICON = path.join(ICONS_DIR, "icon.png")

interface IconConfig {
  name: string
  width: number
  height: number
}

const ICON_SIZES: IconConfig[] = [
  { name: "32x32.png", width: 32, height: 32 },
  { name: "128x128.png", width: 128, height: 128 },
  { name: "128x128@2x.png", width: 256, height: 256 }, // @2x 表示 2 倍分辨率，实际是 256x256
]

async function generateIcons() {
  console.log("🎨 开始生成图标...")
  console.log(`📁 源文件: ${SOURCE_ICON}`)
  console.log(`📂 输出目录: ${ICONS_DIR}`)
  console.log("")

  for (const config of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, config.name)

    try {
      await sharp(SOURCE_ICON)
        .resize(config.width, config.height, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath)

      console.log(`✅ 生成成功: ${config.name} (${config.width}x${config.height})`)
    } catch (error) {
      console.error(`❌ 生成失败: ${config.name}`, error)
      process.exit(1)
    }
  }

  console.log("")
  console.log("🎉 所有图标生成完成!")
}

generateIcons()
