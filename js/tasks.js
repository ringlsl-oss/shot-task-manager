/* ================================================================
 *  tasks.js — 任务列表渲染、搜索、筛选
 * ================================================================ */

window.App = window.App || {};

App.tasks = (function() {
  var currentFilters = {
    search: '',
    paid: 'all',
    category: 'all',
    source: 'all',
    type: 'all'
  };

  // ==================== 渲染任务列表 ====================

  function renderList() {
    App.store.getAll().then(function(tasks) {
      // 按时间倒序排列
      tasks.sort(function(a, b) {
        return dayjs(b.datetime).valueOf() - dayjs(a.datetime).valueOf();
      });

      // 应用筛选
      var filtered = tasks.filter(function(task) {
        // 搜索：项目名称模糊匹配
        if (currentFilters.search) {
          var kw = currentFilters.search.toLowerCase();
          var projectMatch = task.project && task.project.toLowerCase().indexOf(kw) !== -1;
          var clientMatch = task.client && task.client.toLowerCase().indexOf(kw) !== -1;
          if (!projectMatch && !clientMatch) {
            return false;
          }
        }

        // 支付状态
        if (currentFilters.paid === 'paid' && !task.paid) return false;
        if (currentFilters.paid === 'unpaid' && task.paid) return false;

        // 类别
        if (currentFilters.category !== 'all' && task.category !== currentFilters.category) {
          return false;
        }

        // 甲方来源
        if (currentFilters.source !== 'all' && task.clientSource !== currentFilters.source) {
          return false;
        }

        // 任务类型
        if (currentFilters.type !== 'all' && task.taskType !== currentFilters.type) {
          return false;
        }

        return true;
      });

      renderCards(filtered);
      updateIncomeOverview(tasks);
      updateFilterBtnState();
    }).catch(function(err) {
      console.error('读取任务列表失败:', err);
    });
  }

  // ==================== 渲染卡片 ====================

  function renderCards(tasks) {
    var container = document.getElementById('task-list');
    var empty = document.getElementById('task-empty');

    if (tasks.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    var html = '';
    tasks.forEach(function(task) {
      var overdueDays = 0;
      if (!task.paid) {
        overdueDays = App.getOverdueDays(task.datetime);
      }

      var overdueClass = overdueDays > 0 ? ' overdue' : '';
      var paidBadgeClass = task.paid ? 'paid' : (overdueDays > 0 ? 'unpaid overdue-badge' : 'unpaid');
      var paidText = task.paid ? '✅ 已收款' : (overdueDays > 0 ? '⚠️ 超期' + overdueDays + '天' : '⏳ 未收款');

      var isShooting = task.taskType !== 'editing';
      var typeLabels = { video: '📹 视频', photo: '📸 照片', editing: '🎬 剪辑' };
      var typeTag = typeLabels[task.taskType] || (isShooting ? '📹 视频' : '🎬 剪辑');
      var locationHtml = isShooting ? '<span>📍 ' + escapeHtml(task.location || '未知地点') + '</span>' : '';
      var durationHtml = isShooting ? '<span>⏱ ' + App.getDurationLabel(task.duration) + '</span>' : '';

      html += '' +
        '<div class="task-card' + overdueClass + '" data-id="' + task.id + '">' +
          '<div class="card-header">' +
            '<div>' +
              (task.project ? '<span class="project-name">' + escapeHtml(task.project) + '</span>' : '') +
              '<span class="client-name" style="' + (task.project ? 'font-size:0.8rem;color:var(--color-text-muted);display:block;' : '') + '">' + escapeHtml(task.client) + '</span>' +
            '</div>' +
            '<span class="fee">' + App.formatCurrency(task.fee) + '</span>' +
          '</div>' +
          '<div class="card-meta">' +
            locationHtml +
            '<span>📅 ' + App.formatShortDateTime(task.datetime) + '</span>' +
            durationHtml +
          '</div>' +
          '<div class="card-footer">' +
            '<span class="category-badge">' + typeTag + '</span>' +
            '<span class="category-badge" style="margin-left:4px;">' + escapeHtml(task.category || '未分类') + '</span>' +
            '<span class="paid-badge ' + paidBadgeClass + '">' + paidText + '</span>' +
          '</div>' +
        '</div>';
    });

    container.innerHTML = html;

    // 绑定卡片点击（编辑）
    var cards = container.querySelectorAll('.task-card');
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        var id = card.dataset.id;
        App.store.getById(id).then(function(task) {
          if (task) {
            App.form.open('edit', task);
          }
        });
      });

      // 长按删除
      var longPressTimer;
      card.addEventListener('touchstart', function(e) {
        longPressTimer = setTimeout(function() {
          var id = card.dataset.id;
          App.store.getById(id).then(function(task) {
            if (task) {
              App.showConfirm(
                '确认删除？',
                '将删除「' + task.client + '」的拍摄任务，此操作不可恢复。',
                function() {
                  App.store.delete(id).then(function() {
                    App.showToast('已删除 🗑');
                    App.refreshAll();
                  });
                }
              );
            }
          });
        }, 600);
      });
      card.addEventListener('touchend', function() { clearTimeout(longPressTimer); });
      card.addEventListener('touchmove', function() { clearTimeout(longPressTimer); });
    });
  }

  // ==================== 更新首页收入概览 ====================

  function updateIncomeOverview(tasks) {
    var week = App.getWeekRange();
    var month = App.getMonthRange();

    function inRange(t) { return !dayjs(t.datetime).isBefore(week.start) && !dayjs(t.datetime).isAfter(week.end); }
    function inMonth(t) { return !dayjs(t.datetime).isBefore(month.start) && !dayjs(t.datetime).isAfter(month.end); }

    var weekPaid = 0, weekAll = 0, monthPaid = 0, monthAll = 0;

    tasks.forEach(function(t) {
      if (inRange(t)) {
        weekAll += t.fee;
        if (t.paid) weekPaid += t.fee;
      }
      if (inMonth(t)) {
        monthAll += t.fee;
        if (t.paid) monthPaid += t.fee;
      }
    });

    var el = document.getElementById('income-week-paid'); if (el) el.querySelector('.income-amount').textContent = App.formatCurrency(weekPaid);
    var el2 = document.getElementById('income-week-all'); if (el2) el2.querySelector('.income-amount').textContent = App.formatCurrency(weekAll);
    var el3 = document.getElementById('income-month-paid'); if (el3) el3.querySelector('.income-amount').textContent = App.formatCurrency(monthPaid);
    var el4 = document.getElementById('income-month-all'); if (el4) el4.querySelector('.income-amount').textContent = App.formatCurrency(monthAll);
  }

  // ==================== 筛选面板 ====================

  function initFilterPanel() {
    // 动态填充类别筛选芯片
    var catContainer = document.getElementById('filter-category');
    App.CATEGORIES.forEach(function(c) {
      var chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.dataset.value = c;
      chip.textContent = c;
      catContainer.appendChild(chip);
    });

    // 动态填充来源筛选芯片
    var srcContainer = document.getElementById('filter-source');
    App.CLIENT_SOURCES.forEach(function(s) {
      var chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.dataset.value = s;
      chip.textContent = s;
      srcContainer.appendChild(chip);
    });

    // 筛选按钮
    document.getElementById('filter-btn').addEventListener('click', function() {
      var panel = document.getElementById('filter-panel');
      panel.classList.toggle('show');
    });

    // 支付状态筛选芯片
    bindChipGroup('filter-paid', function(val) { currentFilters.paid = val; applyFilters(); });
    bindChipGroup('filter-type', function(val) { currentFilters.type = val; applyFilters(); });
    bindChipGroup('filter-category', function(val) { currentFilters.category = val; applyFilters(); });
    bindChipGroup('filter-source', function(val) { currentFilters.source = val; applyFilters(); });

    // 重置
    document.getElementById('filter-reset').addEventListener('click', function() {
      currentFilters.paid = 'all';
      currentFilters.category = 'all';
      currentFilters.source = 'all';
      currentFilters.type = 'all';
      resetChipGroup('filter-paid');
      resetChipGroup('filter-type');
      resetChipGroup('filter-category');
      resetChipGroup('filter-source');
      applyFilters();
      document.getElementById('filter-panel').classList.remove('show');
    });
  }

  function bindChipGroup(containerId, onChange) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', function(e) {
      if (!e.target.classList.contains('filter-chip')) return;
      var chips = container.querySelectorAll('.filter-chip');
      chips.forEach(function(c) { c.classList.remove('active'); });
      e.target.classList.add('active');
      onChange(e.target.dataset.value);
    });
  }

  function resetChipGroup(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var chips = container.querySelectorAll('.filter-chip');
    chips.forEach(function(c) { c.classList.remove('active'); });
    if (chips.length > 0) chips[0].classList.add('active');
  }

  function updateFilterBtnState() {
    var btn = document.getElementById('filter-btn');
    var hasFilter = currentFilters.paid !== 'all' || currentFilters.category !== 'all' || currentFilters.source !== 'all' || currentFilters.type !== 'all';
    if (hasFilter) {
      btn.classList.add('has-filter');
    } else {
      btn.classList.remove('has-filter');
    }
  }

  function applyFilters() {
    renderList();
  }

  // ==================== 搜索 ====================

  function initSearch() {
    var input = document.getElementById('search-input');
    if (!input) return;

    var debouncedSearch = App.debounce(function() {
      currentFilters.search = input.value.trim();
      renderList();
    }, 200);

    input.addEventListener('input', debouncedSearch);
  }

  // ==================== 工具 ====================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==================== 初始化 ====================

  function init() {
    initFilterPanel();
    initSearch();
  }

  return {
    init: init,
    render: renderList
  };
})();
