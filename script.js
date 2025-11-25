// 寶可夢資料來自 data/pokemon.js
let collectedPokemon = new Set();
let skippedPokemon = new Set();
let currentFilter = 'all';
let isShinyMode = false;

const STORAGE_KEY = 'pokemon-collected';
const SKIPPED_KEY = 'pokemon-skipped';
const SHINY_MODE_KEY = 'pokemon-shiny-mode';
let currentContextMenuPokemonId = null;

// 從 URL hash 讀取篩選狀態
function getFilterFromHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const filter = params.get('filter');
  return filter && ['all', 'collected', 'skipped', 'uncollected'].includes(filter) ? filter : 'all';
}

// 更新 URL hash
function updateHashFilter(filter) {
  window.location.hash = `filter=${filter}`;
}

// 初始化
function init() {
  loadCollectedFromStorage();
  loadSkippedFromStorage();
  loadShinyMode();
  currentFilter = getFilterFromHash();
  updateFilterSelect();
  updateShinyButton();
  renderPokemon();
  setupEventListeners();
}

// 從 localStorage 加載已收集的寶可夢
function loadCollectedFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    collectedPokemon = new Set(JSON.parse(stored));
  }
}

// 保存已收集的寶可夢到 localStorage
function saveCollectedToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...collectedPokemon]));
}

// 從 localStorage 加載跳過的寶可夢
function loadSkippedFromStorage() {
  const stored = localStorage.getItem(SKIPPED_KEY);
  if (stored) {
    skippedPokemon = new Set(JSON.parse(stored));
  }
}

// 保存跳過的寶可夢到 localStorage
function saveSkippedToStorage() {
  localStorage.setItem(SKIPPED_KEY, JSON.stringify([...skippedPokemon]));
}

// 從 localStorage 加載色違模式
function loadShinyMode() {
  const stored = localStorage.getItem(SHINY_MODE_KEY);
  isShinyMode = stored === 'true';
}

// 保存色違模式到 localStorage
function saveShinyMode() {
  localStorage.setItem(SHINY_MODE_KEY, isShinyMode.toString());
}

// 更新色違按鈕樣式
function updateShinyButton() {
  const btn = document.getElementById('shinyBtn');
  if (isShinyMode) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

// 切換色違模式
function toggleShinyMode() {
  isShinyMode = !isShinyMode;
  saveShinyMode();
  updateShinyButton();

  // 更新所有卡片的 sprite 類名
  const cards = document.querySelectorAll('[data-pokemon-id]');
  cards.forEach(card => {
    const pokemonId = card.dataset.pokemonId;
    const pokemon = pokemonList.find(p => p.id === pokemonId);
    if (pokemon && card.updateSpriteClass) {
      card.updateSpriteClass(pokemon);
    }
  });
}

// 更新統計信息
function updateStats() {
  const collected = collectedPokemon.size;
  const skipped = skippedPokemon.size;
  const total = pokemonList.length;
  const remaining = total - collected - skipped;
  document.getElementById('collectedCount').textContent = `已收集: ${collected}`;
  document.getElementById('skippedCount').textContent = `已跳過: ${skipped}`;
  document.getElementById('remainingCount').textContent = `剩餘: ${remaining}`;
}

// 渲染寶可夢卡片
function renderPokemon() {
  const grid = document.getElementById('pokemonGrid');
  grid.innerHTML = '';

  const filteredPokemon = filterPokemon();

  if (filteredPokemon.length === 0) {
    // 如果篩選為「未收集」且沒有結果，顯示恭喜訊息
    if (currentFilter === 'uncollected') {
      grid.innerHTML = `
        <div class="empty-state congratulations">
          <div class="celebration-emoji">🎉</div>
          <div>恭喜！</div>
          <div>你已經收集完所有的寶可夢了！</div>
        </div>
      `;
    } else {
      grid.innerHTML = '<div class="empty-state"><div>沒有找到符合條件的寶可夢 🎉</div></div>';
    }
    return;
  }

  filteredPokemon.forEach(pokemon => {
    const card = createPokemonCard(pokemon);
    grid.appendChild(card);
  });

  updateStats();
}

// 篩選寶可夢
function filterPokemon() {
  return pokemonList.filter(pokemon => {
    if (currentFilter === 'collected') {
      // 已收集篩選：包含已收集的和已跳過的
      return collectedPokemon.has(pokemon.id) || skippedPokemon.has(pokemon.id);
    } else if (currentFilter === 'skipped') {
      // 已跳過篩選：只包含已跳過的
      return skippedPokemon.has(pokemon.id);
    } else if (currentFilter === 'uncollected') {
      // 未收集篩選：不包含已跳過的
      return !collectedPokemon.has(pokemon.id) && !skippedPokemon.has(pokemon.id);
    }
    return true;
  });
}

// 創建單個寶可夢卡片
function createPokemonCard(pokemon) {
  const card = document.createElement('div');
  const isCollected = collectedPokemon.has(pokemon.id);
  const isSkipped = skippedPokemon.has(pokemon.id);

  card.className = `pokemon-card ${isCollected ? 'collected' : ''} ${isSkipped ? 'skipped' : ''}`;
  card.dataset.pokemonId = pokemon.id;

  // 使用 spriteClass，如果沒有則使用預設的 sprite-icon-{id}
  const spriteClass = pokemon.spriteClass || `sprite-icon-${pokemon.id}`;

  // 根據色違模式選擇 sprite class
  const effectiveClass = isShinyMode ? `${spriteClass}-shiny` : spriteClass;

  card.innerHTML = `
    <div class="pokemon-id">#${pokemon.id}</div>
    <div class="pokemon-image-wrapper">
      <span class="sprite-icon ${effectiveClass}" title="${pokemon.nameZh}"></span>
    </div>
    <div class="pokemon-name">${pokemon.nameZh}</div>
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        class="pokemon-checkbox"
        data-id="${pokemon.id}"
        ${isCollected ? 'checked' : ''}
      >
    </div>
  `;

  const checkbox = card.querySelector('.pokemon-checkbox');
  checkbox.addEventListener('change', (e) => handleCheckboxChange(e, pokemon.id, card));

  // 點擊卡片也可以切換狀態
  card.addEventListener('click', (e) => {
    if (e.target !== checkbox) {
      checkbox.click();
    }
  });

  // 右鍵選單事件
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, pokemon.id);
  });

  // 更新 sprite 類名時使用
  card.updateSpriteClass = function(pokemon) {
    const spriteClass = pokemon.spriteClass || `sprite-icon-${pokemon.id}`;
    const effectiveClass = isShinyMode ? `${spriteClass}-shiny` : spriteClass;
    const spriteSpan = card.querySelector('.sprite-icon');
    spriteSpan.className = `sprite-icon ${effectiveClass}`;
  };

  return card;
}

// 處理勾選事件
function handleCheckboxChange(e, pokemonId, card) {
  const isChecked = e.target.checked;

  if (isChecked) {
    collectedPokemon.add(pokemonId);
  } else {
    collectedPokemon.delete(pokemonId);
  }

  saveCollectedToStorage();

  // 更新卡片樣式（立即反應視覺效果）
  if (card) {
    if (isChecked) {
      card.classList.add('collected');
    } else {
      card.classList.remove('collected');
    }
  }

  // 如果當前篩選為"未收集"，勾選後需要隱藏卡片
  if (currentFilter === 'uncollected' && isChecked) {
    // 淡出動畫效果
    card.style.opacity = '0';
    card.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      card.style.display = 'none';
      // 動畫完成後重新渲染，檢查是否所有未收集的都已完成
      renderPokemon();
    }, 300);
  } else if (currentFilter === 'collected' && !isChecked) {
    // 淡出動畫效果
    card.style.opacity = '0';
    card.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      card.style.display = 'none';
      renderPokemon();
    }, 300);
  }

  updateStats();
}

// 更新下拉菜單選項
function updateFilterSelect() {
  document.getElementById('filterSelect').value = currentFilter;
}

// 顯示右鍵選單
function showContextMenu(e, pokemonId) {
  const menu = document.getElementById('contextMenu');
  currentContextMenuPokemonId = pokemonId;

  const isSkipped = skippedPokemon.has(pokemonId);
  const skipOption = document.getElementById('skipOption');
  skipOption.textContent = isSkipped ? '取消跳過' : '標記為跳過';

  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.classList.add('visible');
}

// 隱藏右鍵選單
function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  menu.classList.remove('visible');
  currentContextMenuPokemonId = null;
}

// 切換跳過狀態
function toggleSkipped(pokemonId) {
  if (skippedPokemon.has(pokemonId)) {
    skippedPokemon.delete(pokemonId);
  } else {
    skippedPokemon.add(pokemonId);
  }

  saveSkippedToStorage();
  renderPokemon();
  hideContextMenu();
}

// 設置事件監聽器
function setupEventListeners() {
  // 篩選下拉菜單
  document.getElementById('filterSelect').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    updateHashFilter(currentFilter);
    renderPokemon();
  });

  // 色違按鈕
  document.getElementById('shinyBtn').addEventListener('click', () => {
    toggleShinyMode();
  });

  // 清除按鈕
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('確定要清除所有已收集的記錄嗎？')) {
      collectedPokemon.clear();
      saveCollectedToStorage();
      renderPokemon();
    }
  });

  // 監聽 hash 變化
  window.addEventListener('hashchange', () => {
    currentFilter = getFilterFromHash();
    updateFilterSelect();
    renderPokemon();
  });

  // 右鍵選單事件
  document.getElementById('skipOption').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentContextMenuPokemonId) {
      toggleSkipped(currentContextMenuPokemonId);
    }
  });

  // 點擊其他地方隱藏選單
  document.addEventListener('click', (e) => {
    // 如果點擊的不是選單或選單項目，則隱藏選單
    const menu = document.getElementById('contextMenu');
    if (!menu.contains(e.target)) {
      hideContextMenu();
    }
  });

  // 點擊選單外的地方也隱藏（但不包括卡片的 contextmenu）
  document.addEventListener('contextmenu', (e) => {
    const menu = document.getElementById('contextMenu');
    // 如果點擊的地方不是卡片，就隱藏選單
    if (!e.target.closest('.pokemon-card')) {
      hideContextMenu();
    }
  });
}

// 頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
