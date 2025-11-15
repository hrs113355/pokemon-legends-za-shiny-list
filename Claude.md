# 寶可夢 ZA 色違收集清單 - 功能說明文檔

## 專案概述
這是一個用於追蹤寶可夢 ZA 版本色違收集進度的互動式網頁工具。

**技術棧：** HTML5 + CSS3 + Vanilla JavaScript + localStorage

---

## 核心功能

### 1. 寶可夢卡片系統
- **已收集**：綠色漸層背景 (#84fab0 → #8fd3f4) + 綠色邊框 + ✓ 符號
- **未收集**：白色背景，普通樣式
- **已跳過**：灰色漸層背景 (#ccc → #aaa) + 虛線邊框 + ✕ 符號 + 文字刪除線 + 70% 透明度

**交互方式：**
- **點擊卡片**：勾選/取消勾選（標記為已收集）
- **右鍵點擊**：顯示浮動右鍵選單（標記為跳過/取消跳過）

### 2. 篩選系統
三種篩選模式（保存在 URL hash 中）：
- **全部 (230)**：顯示所有寶可夢
- **已收集**：包含已收集 + 已跳過 的寶可夢
- **未收集**：只顯示未收集且未跳過的寶可夢

```javascript
// filterPokemon() 邏輯
if (currentFilter === 'collected') {
  return collectedPokemon.has(pokemon.id) || skippedPokemon.has(pokemon.id);
} else if (currentFilter === 'uncollected') {
  return !collectedPokemon.has(pokemon.id) && !skippedPokemon.has(pokemon.id);
}
```

### 3. 統計面板
狀態列顯示四個統計數據：
- **已收集**：用戶勾選的寶可夢數量
- **已跳過**：用戶標記為跳過的寶可夢數量
- **剩餘**：總數 - 已收集 - 已跳過
- **總數**：固定 230

```javascript
// updateStats() 計算邏輯
const collected = collectedPokemon.size;
const skipped = skippedPokemon.size;
const total = pokemonList.length; // 230
const remaining = total - collected - skipped;
```

### 4. 色違模式切換
- **按鈕樣式**：
  - 關閉狀態：灰色 (#999)
  - 開啟狀態：金色 (#f39c12) + 發光效果 (0 0 15px rgba(243, 156, 18, 0.6))
- **功能**：切換卡片上精靈圖的版本（普通 vs 色違）
- **持久化**：保存在 localStorage (`pokemon-shiny-mode`)

### 5. 清除功能
- **清除所有**：一鍵清除所有已收集的記錄（需確認）
- 不會清除已跳過的記錄

---

## 數據持久化

使用 localStorage 存儲三種數據：

| Key | 說明 | 數據格式 |
|-----|------|---------|
| `pokemon-collected` | 已收集的寶可夢 ID | JSON 陣列 |
| `pokemon-skipped` | 已跳過的寶可夢 ID | JSON 陣列 |
| `pokemon-shiny-mode` | 色違模式開關 | `'true'` 或 `'false'` |

**加載時機：** 頁面加載時在 `init()` 函數中從 localStorage 讀取

```javascript
loadCollectedFromStorage();
loadSkippedFromStorage();
loadShinyMode();
```

---

## 關鍵實現細節

### 右鍵選單系統
```javascript
// showContextMenu(e, pokemonId) - 顯示右鍵選單
// - 動態設置選單文本（「標記為跳過」或「取消跳過」）
// - 按 mouseX/Y 定位選單位置

// hideContextMenu() - 隱藏右鍵選單
// - 點擊其他地方時自動隱藏

// toggleSkipped(pokemonId) - 切換跳過狀態
// - 添加/刪除到 skippedPokemon Set
// - 保存到 localStorage
// - 重新渲染卡片
```

### 事件監聽綁定
```javascript
// 卡片層級
card.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showContextMenu(e, pokemon.id);
});

// 全局層級
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target)) {
    hideContextMenu();
  }
});

document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('.pokemon-card')) {
    hideContextMenu();
  }
});
```

### 卡片樣式切換
創建卡片時根據狀態自動添加 CSS 類：
```javascript
card.className = `pokemon-card ${isCollected ? 'collected' : ''} ${isSkipped ? 'skipped' : ''}`;
```

---

## 文件結構

```
pokemon_za_list/
├── index.html                    # 主應用（包含所有 HTML + CSS + JS）
├── README.md                     # GitHub 專案說明
├── Claude.md                     # 本文檔（開發者文檔）
├── .gitignore                    # Git 忽略配置
├── favicon.ico                   # 網站 icon（精靈球）
├── MSP_Normal.webp              # 普通版精靈圖 (3.1 MB, 5x6 sprite)
├── MSP_Shiny.webp               # 色違版精靈圖 (3.0 MB, 5x6 sprite)
├── data/
│   ├── pokemon.js               # 寶可夢數據列表 (230 個)
│   ├── pokemon.json             # JSON 格式寶可夢數據
│   └── sprites.css              # 精靈圖 CSS 樣式
└── utils/
    └── scrape.rb                # Ruby 爬蟲腳本（用於爬取寶可夢數據）
```

---

## 變量和常量

### 全局變量
```javascript
let collectedPokemon = new Set();     // 已收集的寶可夢 ID
let skippedPokemon = new Set();       // 已跳過的寶可夢 ID
let currentFilter = 'all';            // 當前篩選模式
let isShinyMode = false;              // 色違模式開關
let currentContextMenuPokemonId = null; // 右鍵選單目標 ID
```

### localStorage 鍵值
```javascript
const STORAGE_KEY = 'pokemon-collected';
const SKIPPED_KEY = 'pokemon-skipped';
const SHINY_MODE_KEY = 'pokemon-shiny-mode';
```

---

## CSS 核心類別

### 卡片樣式
```css
.pokemon-card              /* 基礎卡片樣式 */
.pokemon-card.collected    /* 已收集狀態 */
.pokemon-card.skipped      /* 已跳過狀態 */
.pokemon-card:hover        /* 懸停效果 */
```

### 右鍵選單
```css
.context-menu              /* 選單容器 */
.context-menu.visible      /* 顯示選單 */
.context-menu-item         /* 選單項目 */
.context-menu-item:hover   /* 選單項目懸停 */
```

### 按鈕樣式
```css
.shiny-btn                 /* 色違按鈕 */
.shiny-btn.active          /* 色違按鈕激活（金色發光） */
.clear-btn                 /* 清除按鈕 */
```

---

## 功能流程圖

### 初始化流程
```
頁面加載
  ↓
DOMContentLoaded / 直接執行 init()
  ↓
loadCollectedFromStorage()
loadSkippedFromStorage()
loadShinyMode()
  ↓
getFilterFromHash() → updateFilterSelect()
updateShinyButton()
  ↓
renderPokemon() → filterPokemon() → createPokemonCard()
  ↓
setupEventListeners()
  ↓
頁面就緒
```

### 勾選寶可夢流程
```
點擊卡片 / 點擊勾選框
  ↓
handleCheckboxChange()
  ↓
collectedPokemon.add/delete(pokemonId)
  ↓
saveCollectedToStorage()
  ↓
更新卡片樣式（立即反應）
  ↓
updateStats()
```

### 標記跳過流程
```
右鍵點擊卡片
  ↓
showContextMenu(e, pokemonId)
  ↓
點擊選單項目
  ↓
toggleSkipped(pokemonId)
  ↓
skippedPokemon.add/delete(pokemonId)
  ↓
saveSkippedToStorage()
  ↓
renderPokemon()
  ↓
hideContextMenu()
```

---

## 已知限制與注意事項

1. **localStorage 容量**：
   - 正常情況下不會超過 localStorage 限制（通常 5-10MB）
   - 當前數據量：最多 230 個 ID × 2 個 Set + 1 個布爾值

2. **跳過與已收集的獨立性**：
   - 一個寶可夢可以同時被標記為「已跳過」和「已收集」
   - 建議用戶選擇其中一種操作方式

3. **篩選邏輯**：
   - 「已收集」篩選會同時顯示已跳過的寶可夢
   - 「未收集」篩選會排除已跳過的寶可夢
   - 「全部」篩選會顯示所有寶可夢

4. **精靈圖來源**：
   - 使用 webp 格式（MSP_Normal.webp 和 MSP_Shiny.webp）
   - 5×6 sprite 排列，每個 128×128 像素

---

## 快速上手指南

### 基本操作
1. **標記已收集**：點擊寶可夢卡片或勾選框
2. **標記跳過**：右鍵點擊卡片 → 選擇「標記為跳過」
3. **切換色違**：點擊「✨ 色違」按鈕
4. **篩選**：使用上方篩選下拉菜單
5. **清除所有**：點擊「清除所有」按鈕（清除已收集記錄，不含跳過）

### 理解統計數據
- **已收集 (10)**：你勾選了 10 個
- **已跳過 (5)**：你標記了 5 個跳過
- **剩餘 (215)**：還有 215 個需要收集
- **總數 (230)**：總共 230 個

---

## 修改建議

如果要進一步擴展功能，以下是一些可能的方向：

### 簡單擴展
- [ ] 添加單個寶可夢的刪除按鈕（而不是一次清除所有）
- [ ] 按世代或類型篩選
- [ ] 顯示進度百分比
- [ ] 導出/導入 JSON 備份

### 中等難度擴展
- [ ] 搜尋功能（按名稱搜尋）
- [ ] 記錄收集日期
- [ ] 暗黑模式切換
- [ ] 響應式設計優化

### 高難度擴展
- [ ] 多用戶支持（帳號系統）
- [ ] 雲端同步
- [ ] 社交分享功能
- [ ] PWA 離線支持

---

## 開發者備忘錄

### 添加新功能時的檢查清單
- [ ] 是否需要新的 CSS 樣式類？
- [ ] 是否需要新的 localStorage key？
- [ ] 是否需要更新 `updateStats()`？
- [ ] 是否需要更新 `filterPokemon()`？
- [ ] 是否需要在 `setupEventListeners()` 中添加事件監聽？
- [ ] 是否需要更新 HTML 結構？
- [ ] 是否需要測試不同的篩選模式？

### 常見修改位置

| 需求 | 修改位置 |
|------|---------|
| 修改卡片樣式 | CSS: `.pokemon-card` 及其衍生類 |
| 修改統計邏輯 | `updateStats()` 函數 |
| 修改篩選邏輯 | `filterPokemon()` 函數 |
| 添加新事件 | `setupEventListeners()` 函數 |
| 修改卡片內容 | `createPokemonCard()` 函數 |
| 修改按鈕樣式 | CSS: `.shiny-btn`, `.clear-btn` |

---

**最後更新日期：** 2025-11-16
**功能完成度：** 100% (所有核心功能已實作)
