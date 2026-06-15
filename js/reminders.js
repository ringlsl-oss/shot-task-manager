/* ================================================================
 *  reminders.js — 支付提醒 + ICS 日历文件生成
 * ================================================================ */

window.App = window.App || {};

App.reminders = (function() {

  // ==================== 渲染提醒列表 ====================

  function render() {
    App.store.getAll().then(function(tasks) {
      // 筛选：未支付 + 拍摄时间超过5天
      var now = dayjs().startOf('day');
      var overdue = [];

      tasks.forEach(function(t) {
        if (!t.paid) {
          var shootDate = dayjs(t.datetime).startOf('day');
          var dueDate = shootDate.add(5, 'day');
          if (now.isAfter(dueDate)) {
            var days = now.diff(dueDate, 'day');
            overdue.push({
              task: t,
              overdueDays: days
            });
          }
        }
      });

      // 按逾期天数降序
      overdue.sort(function(a, b) { return b.overdueDays - a.overdueDays; });

      renderList(overdue);
    });
  }

  // ==================== 渲染列表 ====================

  function renderList(overdue) {
    var container = document.getElementById('reminder-list');
    var empty = document.getElementById('reminder-empty');
    var bulkBar = document.getElementById('bulk-action-bar');
    var countEl = document.getElementById('reminder-count');

    countEl.textContent = overdue.length;

    if (overdue.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      bulkBar.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    bulkBar.style.display = 'block';

    var html = '';
    overdue.forEach(function(item) {
      var t = item.task;
      html += '' +
        '<div class="task-card overdue">' +
          '<div class="card-header">' +
            '<span class="client-name">' + escapeHtml(t.client) + '</span>' +
            '<span class="overdue-badge">⚠️ 超期' + item.overdueDays + '天</span>' +
          '</div>' +
          '<div class="card-meta">' +
            '<span>' + (t.taskType === 'editing' ? '🎬 剪辑' : '📷 拍摄') + '</span>' +
            (t.taskType !== 'editing' ? '<span>📍 ' + escapeHtml(t.location || '未知地点') + '</span>' : '') +
            '<span>📅 时间: ' + App.formatShortDateTime(t.datetime) + '</span>' +
            '<span>💰 ' + App.formatCurrency(t.fee) + '</span>' +
          '</div>' +
          '<div class="card-footer">' +
            '<span class="category-badge">' + escapeHtml(t.category || '未分类') + '</span>' +
            '<span>⏱ ' + App.getDurationLabel(t.duration) + '</span>' +
          '</div>' +
          '<div style="margin-top:8px;text-align:right;">' +
            '<button class="btn btn-outline btn-sm btn-ics-single" data-id="' + t.id + '" data-days="' + item.overdueDays + '">📅 催款提醒到日历</button>' +
          '</div>' +
        '</div>';
    });

    container.innerHTML = html;

    // 绑定单个ICS下载按钮
    var btns = container.querySelectorAll('.btn-ics-single');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        var days = parseInt(btn.dataset.days) || 0;
        App.store.getById(id).then(function(task) {
          if (task) {
            downloadOverdueICS(task, days);
          }
        });
      });
    });
  }

  // ==================== ICS 文件生成 ====================

  function generateICS(task) {
    // 拍摄开始时间
    var dtStart = dayjs(task.datetime);
    // 拍摄结束时间 = 开始 + 时长
    var dtEnd = dtStart.add(task.duration, 'hour');

    // ICS 格式要求: YYYYMMDDTHHmmss
    function toICSDate(d) {
      return d.format('YYYYMMDDTHHmmss');
    }

    var now = dayjs().format('YYYYMMDDTHHmmss');

    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//拍摄任务管理助手//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'DTSTART:' + toICSDate(dtStart),
      'DTEND:' + toICSDate(dtEnd),
      'DTSTAMP:' + now,
      'SUMMARY:[拍摄] ' + (task.client || ''),
      'DESCRIPTION:客户：' + (task.client || '') + '\\n',
      '地点：' + (task.location || '') + '\\n',
      '费用：' + task.fee + '元\\n',
      '时长：' + App.getDurationLabel(task.duration) + '\\n',
      '类别：' + (task.category || '') + '\\n',
      '器材：' + (task.equipment || ''),
      'LOCATION:' + (task.location || ''),
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:拍摄任务提醒：' + (task.client || '') + '，地点：' + (task.location || '') + '，30分钟后开始',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return ics;
  }

  // ==================== 生成逾期支付提醒的ICS ====================

  function generateOverdueICS(task, overdueDays) {
    var now = dayjs();
    var dtStart = now.add(1, 'hour');
    var dtEnd = dtStart.add(30, 'minute');

    function toICSDate(d) {
      return d.format('YYYYMMDDTHHmmss');
    }

    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//拍摄任务管理助手//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'DTSTART:' + toICSDate(dtStart),
      'DTEND:' + toICSDate(dtEnd),
      'DTSTAMP:' + now.format('YYYYMMDDTHHmmss'),
      'SUMMARY:🔔 催款：' + (task.client || '') + '（超期' + overdueDays + '天）',
      'DESCRIPTION:客户：' + (task.client || '') + '\\n',
      '费用：' + task.fee + '元\\n',
      '拍摄日期：' + App.formatDateTime(task.datetime) + '\\n',
      '已逾期' + overdueDays + '天未支付',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:DISPLAY',
      'DESCRIPTION:提醒催款：' + (task.client || '') + '，欠款' + task.fee + '元',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return ics;
  }

  // ==================== 下载ICS文件 ====================

  function downloadICS(icsString, filename) {
    var blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 单个任务排期ICS
  function downloadSingleICS(task) {
    var ics = generateICS(task);
    var filename = '拍摄_' + (task.client || '任务') + '_' + dayjs(task.datetime).format('MMDD') + '.ics';
    downloadICS(ics, filename);
    App.showToast('日历文件已下载 📅');
  }

  // 单个逾期提醒ICS
  function downloadOverdueICS(task, overdueDays) {
    var ics = generateOverdueICS(task, overdueDays);
    var filename = '催款_' + (task.client || '任务') + '.ics';
    downloadICS(ics, filename);
    App.showToast('提醒日历已下载 📅');
  }

  // 批量所有逾期的ICS（合并到一个文件）
  function downloadBulkICS() {
    App.store.getAll().then(function(tasks) {
      var now = dayjs().startOf('day');
      var icsParts = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//拍摄任务管理助手//CN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      var hasAny = false;
      tasks.forEach(function(t) {
        if (!t.paid) {
          var shootDate = dayjs(t.datetime).startOf('day');
          var dueDate = shootDate.add(5, 'day');
          if (now.isAfter(dueDate)) {
            hasAny = true;
            var overdueDays = now.diff(dueDate, 'day');
            var dtStart = dayjs().add(1, 'hour');
            var dtEnd = dtStart.add(30, 'minute');

            function toICS(d) { return d.format('YYYYMMDDTHHmmss'); }

            icsParts.push('BEGIN:VEVENT');
            icsParts.push('DTSTART:' + toICS(dtStart));
            icsParts.push('DTEND:' + toICS(dtEnd));
            icsParts.push('SUMMARY:催款：' + (t.client || '') + ' - ' + App.formatCurrency(t.fee) + '（超期' + overdueDays + '天）');
            icsParts.push('DESCRIPTION:客户：' + (t.client || '') + '\\n费用：' + t.fee + '元\\n已逾期' + overdueDays + '天');
            icsParts.push('END:VEVENT');
          }
        }
      });

      icsParts.push('END:VCALENDAR');

      if (hasAny) {
        downloadICS(icsParts.join('\r\n'), '所有催款提醒.ics');
        App.showToast('所有提醒已打包下载 📅');
      }
    });
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
    var bulkBtn = document.getElementById('btn-bulk-ics');
    if (bulkBtn) {
      bulkBtn.addEventListener('click', downloadBulkICS);
    }
  }

  return {
    init: init,
    render: render
  };
})();
