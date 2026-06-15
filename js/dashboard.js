/* ================================================================
 *  dashboard.js — 统计看板：本周/本月收入、月度图表、年度汇总
 * ================================================================ */

window.App = window.App || {};

App.dashboard = (function() {
  var currentYear = dayjs().year();
  var monthlyChart = null;
  var selectedMonth = null; // null = 当前月, 否则为 dayjs 对象

  // ==================== 渲染统计看板 ====================

  function render() {
    App.store.getAll().then(function(tasks) {
      updateMonthUI();
      renderIncomeCards(tasks);
      renderRank(tasks);
      renderAvgRate(tasks);
      renderDeliveryStats(tasks);
      renderMonthlyChart(tasks);
      renderYearSummary(tasks);
    }).catch(function(err) {
      console.error('统计计算失败:', err);
    });
  }

  function getTargetMonth() {
    return selectedMonth || dayjs();
  }

  function updateMonthUI() {
    var m = getTargetMonth();
    var isCurrent = !selectedMonth;
    document.getElementById('month-label').textContent = m.format('YYYY年 M月');
    document.getElementById('month-next').style.visibility = isCurrent ? 'hidden' : 'visible';
    document.getElementById('month-today').style.display = isCurrent ? 'none' : 'inline-flex';
    document.getElementById('stats-income-title').textContent = isCurrent ? '📊 本周 / 本月收入' : '📊 ' + m.format('M月') + '收入';
    document.getElementById('stats-week-paid').closest('.income-card').style.display = isCurrent ? '' : 'none';
    document.getElementById('stats-week-all').closest('.income-card').style.display = isCurrent ? '' : 'none';
  }

  // ==================== 收入卡片 ====================

  function renderIncomeCards(tasks) {
    var week = App.getWeekRange();
    var targetMonth = getTargetMonth();
    var month = { start: targetMonth.startOf('month'), end: targetMonth.endOf('month') };

    function inWeek(t) { return !dayjs(t.datetime).isBefore(week.start) && !dayjs(t.datetime).isAfter(week.end); }
    function inMonth(t) { return !dayjs(t.datetime).isBefore(month.start) && !dayjs(t.datetime).isAfter(month.end); }

    var wp = 0, wa = 0, mp = 0, ma = 0;

    tasks.forEach(function(t) {
      if (inWeek(t)) {
        wa += t.fee;
        if (t.paid) wp += t.fee;
      }
      if (inMonth(t)) {
        ma += t.fee;
        if (t.paid) mp += t.fee;
      }
    });

    setText('stats-week-paid', App.formatCurrency(wp));
    setText('stats-week-all', App.formatCurrency(wa));
    setText('stats-month-paid', App.formatCurrency(mp));
    setText('stats-month-all', App.formatCurrency(ma));
  }

  // ==================== 交片统计 ====================

  function renderDeliveryStats(tasks) {
    var targetMonth = getTargetMonth();
    var month = { start: targetMonth.startOf('month'), end: targetMonth.endOf('month') };

    var total = 0, delivered = 0;
    tasks.forEach(function(t) {
      if (!dayjs(t.datetime).isBefore(month.start) && !dayjs(t.datetime).isAfter(month.end)) {
        total++;
        if (t.delivered) delivered++;
      }
    });

    var rate = total > 0 ? Math.round(delivered / total * 100) : 0;
    document.getElementById('stats-del-count').textContent = delivered + '/' + total;
    document.getElementById('stats-del-rate').textContent = rate + '%';
  }

  // ==================== 段位计算 ====================

  function renderRank(tasks) {
    var targetMonth = getTargetMonth();
    var month = { start: targetMonth.startOf('month'), end: targetMonth.endOf('month') };
    var totalIncome = 0;

    tasks.forEach(function(t) {
      if (!dayjs(t.datetime).isBefore(month.start) && !dayjs(t.datetime).isAfter(month.end)) {
        totalIncome += t.fee;
      }
    });

    var tiers = [
      { max: 5000,  name: '青铜', icon: '🥉', color: '#CD7F32' },
      { max: 7000,  name: '白银', icon: '🥈', color: '#C0C0C0' },
      { max: 9000,  name: '黄金', icon: '🥇', color: '#FFD700' },
      { max: 11000, name: '铂金', icon: '💎', color: '#7B2D8E' },
      { max: 13000, name: '钻石', icon: '💠', color: '#00BFFF' },
      { max: 15000, name: '星耀', icon: '🌟', color: '#FF6347' },
      { max: Infinity, name: '王者', icon: '👑', color: '#FF4500' }
    ];

    var rank = tiers[0];
    var prevMax = 0;
    for (var i = 0; i < tiers.length; i++) {
      if (totalIncome <= tiers[i].max) {
        rank = tiers[i];
        break;
      }
      prevMax = tiers[i].max;
    }

    var nextTarget = rank.max === Infinity ? null : rank.max;
    var progress = rank.max === Infinity ? 100 : Math.min(100, Math.round((totalIncome - prevMax) / (rank.max - prevMax) * 100));
    var remaining = nextTarget ? nextTarget - totalIncome : 0;

    document.getElementById('rank-icon').textContent = rank.icon;
    document.getElementById('rank-name').textContent = rank.name + ' · ' + App.formatCurrency(totalIncome);
    document.getElementById('rank-name').style.color = rank.color;
    document.getElementById('rank-progress-bar').style.width = progress + '%';
    document.getElementById('rank-progress-bar').style.background = 'linear-gradient(90deg, ' + rank.color + ', ' + (tiers[Math.min(tiers.indexOf(rank) + 1, tiers.length - 1)].color) + ')';

    if (nextTarget) {
      document.getElementById('rank-sub').textContent = '距离' + tiers[tiers.indexOf(rank) + 1].name + '还需 ' + App.formatCurrency(remaining);
    } else {
      document.getElementById('rank-sub').textContent = '已达最高段位！👑';
    }

    // 段位升级检测
    var lastRank = localStorage.getItem('shot_last_rank');
    if (lastRank && rank.name !== lastRank) {
      var lastIdx = -1, curIdx = tiers.indexOf(rank);
      tiers.forEach(function(t, i) { if (t.name === lastRank) lastIdx = i; });
      if (curIdx > lastIdx) {
        showRankUpPopup(rank);
      }
    }
    localStorage.setItem('shot_last_rank', rank.name);
  }

  function showRankUpPopup(rank) {
    // 创建弹窗
    var overlay = document.createElement('div');
    overlay.className = 'rankup-overlay';
    overlay.innerHTML = '' +
      '<div class="rankup-dialog">' +
        '<div class="rankup-icon">' + rank.icon + '</div>' +
        '<div class="rankup-title">🎉 段位提升！</div>' +
        '<div class="rankup-rank" style="color:' + rank.color + '">' + rank.name + '</div>' +
        '<button class="btn btn-primary rankup-btn">太棒了！</button>' +
      '</div>';
    document.body.appendChild(overlay);

    setTimeout(function() { overlay.classList.add('show'); }, 100);

    var close = function() {
      overlay.classList.remove('show');
      setTimeout(function() { document.body.removeChild(overlay); }, 300);
    };
    overlay.querySelector('.rankup-btn').addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  }

  // ==================== 本月平均时薪 ====================

  function renderAvgRate(tasks) {
    var targetMonth = getTargetMonth();
    var month = { start: targetMonth.startOf('month'), end: targetMonth.endOf('month') };
    var totalFee = 0;
    var totalHours = 0;

    tasks.forEach(function(t) {
      if (!dayjs(t.datetime).isBefore(month.start) && !dayjs(t.datetime).isAfter(month.end)) {
        if (t.paid) {
          totalFee += t.fee;
          totalHours += t.duration;
        }
      }
    });

    var avgRate = totalHours > 0 ? Math.round(totalFee / totalHours) : 0;
    setText('stats-avg-rate', App.formatCurrency(avgRate));
  }

  // ==================== 月度收入图表 ====================

  function renderMonthlyChart(tasks) {
    // 近12个月
    var months = [];
    var now = dayjs();
    for (var i = 11; i >= 0; i--) {
      var d = now.subtract(i, 'month');
      months.push({
        start: d.startOf('month'),
        end: d.endOf('month'),
        label: d.format('M月')
      });
    }

    var paidData = [];
    var unpaidData = [];

    months.forEach(function(m) {
      var paid = 0, unpaid = 0;
      tasks.forEach(function(t) {
        var td = dayjs(t.datetime);
        if (!td.isBefore(m.start) && !td.isAfter(m.end)) {
          if (t.paid) { paid += t.fee; }
          else { unpaid += t.fee; }
        }
      });
      paidData.push(paid);
      unpaidData.push(unpaid);
    });

    // 检查 Chart.js 是否可用
    if (typeof Chart === 'undefined') {
      // 降级：文字表格
      renderChartFallback(months, paidData, unpaidData);
      return;
    }

    document.getElementById('chart-fallback').style.display = 'none';
    var canvas = document.getElementById('chart-monthly');
    canvas.style.display = 'block';

    var ctx = canvas.getContext('2d');

    if (monthlyChart) {
      monthlyChart.destroy();
    }

    monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months.map(function(m) { return m.label; }),
        datasets: [
          {
            label: '已到账',
            data: paidData,
            backgroundColor: '#16a34a',
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: '未到账',
            data: unpaidData,
            backgroundColor: '#f59e0b',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ctx.dataset.label + ': ' + App.formatCurrency(ctx.raw);
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false }
          },
          y: {
            stacked: true,
            ticks: {
              callback: function(v) { return App.formatCurrency(v); }
            }
          }
        }
      }
    });

    canvas.parentElement.style.height = '280px';
  }

  function renderChartFallback(months, paidData, unpaidData) {
    document.getElementById('chart-monthly').style.display = 'none';
    var fallback = document.getElementById('chart-fallback');
    fallback.style.display = 'block';

    var html = '<div class="chart-container"><table style="width:100%;font-size:0.8rem;">' +
      '<tr style="border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:6px">月份</th>' +
      '<th style="text-align:right;padding:6px">已到账</th>' +
      '<th style="text-align:right;padding:6px">未到账</th></tr>';

    var hasData = false;
    months.forEach(function(m, i) {
      if (paidData[i] > 0 || unpaidData[i] > 0) hasData = true;
      html += '<tr style="border-bottom:1px solid #f1f5f9">' +
        '<td style="padding:6px">' + m.label + '</td>' +
        '<td style="text-align:right;padding:6px;color:#16a34a">' + App.formatCurrency(paidData[i]) + '</td>' +
        '<td style="text-align:right;padding:6px;color:#f59e0b">' + App.formatCurrency(unpaidData[i]) + '</td>' +
        '</tr>';
    });

    if (!hasData) {
      html += '<tr><td colspan="3" style="text-align:center;padding:20px;color:#94a3b8">暂无数据</td></tr>';
    }

    html += '</table></div>';
    fallback.innerHTML = html;
  }

  // ==================== 年度汇总 ====================

  function renderYearSummary(tasks) {
    setText('year-label', currentYear);

    var total = 0, paid = 0, count = 0;
    tasks.forEach(function(t) {
      if (dayjs(t.datetime).year() === currentYear) {
        total += t.fee;
        if (t.paid) paid += t.fee;
        count++;
      }
    });

    setText('ys-total', App.formatCurrency(total));
    setText('ys-paid', App.formatCurrency(paid));
    setText('ys-unpaid', App.formatCurrency(total - paid));
    setText('ys-count', count);
  }

  // ==================== 年份切换 ====================

  function initYearSwitcher() {
    document.getElementById('year-prev').addEventListener('click', function() {
      currentYear--;
      render();
    });
    document.getElementById('year-next').addEventListener('click', function() {
      currentYear++;
      render();
    });
  }

  // ==================== 工具 ====================

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ==================== 初始化 ====================

  function init() {
    initYearSwitcher();
    initMonthSwitcher();
  }

  function initMonthSwitcher() {
    document.getElementById('month-prev').addEventListener('click', function() {
      var m = getTargetMonth().subtract(1, 'month');
      if (m.isAfter(dayjs().startOf('month'))) return;
      selectedMonth = m;
      render();
    });
    document.getElementById('month-next').addEventListener('click', function() {
      if (!selectedMonth) return;
      var m = selectedMonth.add(1, 'month');
      if (m.isAfter(dayjs().startOf('month'))) {
        selectedMonth = null; // 回到本月
      } else {
        selectedMonth = m;
      }
      render();
    });
    document.getElementById('month-today').addEventListener('click', function() {
      selectedMonth = null;
      render();
    });
  }

  return {
    init: init,
    render: render
  };
})();
