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

    // 自动恢复：如果 IndexedDB 为空但 localStorage 有备份，自动恢复
    App.store.getAll().then(function(tasks) {
      if (!tasks || tasks.length === 0) {
        var backupInfo = App.store.getBackupInfo();
        if (backupInfo) {
          App.store.restoreFromLocal().then(function(count) {
            if (count > 0) {
              App.showToast('数据已自动恢复 ' + count + ' 条 ✅');
              App.refreshAll();
            }
          });
          return;
        }
      }
      App.refreshAll();
    });
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

  // ==================== 暴露切换方法 ====================

  App.switchTab = switchTab;

})();
