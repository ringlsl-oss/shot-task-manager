/* ================================================================
 *  app.js — 主入口：初始化、Tab切换、全局事件
 * ================================================================ */

window.App = window.App || {};

(function() {

  // ==================== 当前激活的Tab ====================

  var currentTab = 'tasks';

  // ==================== DOMContentLoaded ====================

  document.addEventListener('DOMContentLoaded', function() {
    initTabBar();
    initFAB();
    initConfirmDialog();
    App.form.init();
    App.tasks.init();
    App.dashboard.init();
    App.reminders.init();
    App.exportData.init();
    initDataRestore();

    // 初始渲染
    App.refreshAll();
  });

  // ==================== Tab 切换 ====================

  function initTabBar() {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var tabName = item.dataset.tab;
        switchTab(tabName);
      });
    });
  }

  function switchTab(tabName) {
    if (currentTab === tabName) return;

    // 移除所有激活态
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    document.querySelectorAll('.tab-page').forEach(function(p) { p.classList.remove('active'); });

    // 激活目标Tab
    var targetNav = document.querySelector('.nav-item[data-tab="' + tabName + '"]');
    var targetPage = document.getElementById('tab-' + tabName);

    if (targetNav) targetNav.classList.add('active');
    if (targetPage) targetPage.classList.add('active');

    currentTab = tabName;

    // FAB 只在任务列表页显示
    var fab = document.getElementById('fab-add');
    if (fab) {
      fab.style.display = tabName === 'tasks' ? 'flex' : 'none';
    }

    // 切换到统计页时刷新图表
    if (tabName === 'stats') {
      App.dashboard.render();
    }

    // 切换到提醒页时刷新
    if (tabName === 'reminders') {
      App.reminders.render();
    }
  }

  // ==================== FAB 新增按钮 ====================

  function initFAB() {
    var fab = document.getElementById('fab-add');
    if (fab) {
      fab.addEventListener('click', function() {
        App.form.open('create', null);
      });
    }
  }

  // ==================== Toast 提示 ====================

  App.showToast = function(message) {
    // 移除已有 toast
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2000);
  };

  // ==================== 确认对话框 ====================

  var confirmCallback = null;

  function initConfirmDialog() {
    document.getElementById('confirm-cancel').addEventListener('click', function() {
      hideConfirm();
    });
    document.getElementById('confirm-ok').addEventListener('click', function() {
      if (confirmCallback) confirmCallback();
      hideConfirm();
    });
    document.getElementById('confirm-dialog').addEventListener('click', function(e) {
      if (e.target === this) hideConfirm();
    });
  }

  App.showConfirm = function(title, message, onConfirm) {
    confirmCallback = onConfirm;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = message;
    document.getElementById('confirm-dialog').classList.add('show');
  };

  function hideConfirm() {
    document.getElementById('confirm-dialog').classList.remove('show');
    confirmCallback = null;
  }

  // ==================== 全局刷新 ====================

  App.refreshAll = function() {
    App.tasks.render();
    App.dashboard.render();
    App.reminders.render();
  };

  // ==================== 数据恢复（JSON导入） ====================

  function initDataRestore() {
    // 监听拖拽/粘贴JSON文件到页面（桌面端恢复数据用）
    // 这里做一个隐藏的文件输入，用户在统计页可以点击"导入备份"
    // 在统计页添加一个导入按钮——通过export模块处理

    // 在dashboard导出按钮区域动态注入导入按钮
    var exportSection = document.querySelector('#tab-stats .export-buttons');
    if (exportSection) {
      var importBtn = document.createElement('button');
      importBtn.className = 'btn btn-outline btn-sm';
      importBtn.textContent = '📂 恢复备份';
      importBtn.style.flex = '1';
      importBtn.addEventListener('click', function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        input.addEventListener('change', function() {
          if (input.files && input.files[0]) {
            App.exportData.importJSON(input.files[0]);
          }
        });
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      });
      exportSection.appendChild(importBtn);
    }
  }

  // ==================== 暴露切换方法 ====================

  App.switchTab = switchTab;

})();
