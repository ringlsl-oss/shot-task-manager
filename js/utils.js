/* ================================================================
 *  utils.js — 工具函数、常量、格式化
 * ================================================================ */

window.App = window.App || {};

// ==================== 常量 ====================

App.CATEGORIES = ['微课', '宣传片', '活动', '纪录片', '党建片', '生日照片', '活动照片', '节目背景'];
App.CLIENT_SOURCES = ['个人一手业务', '其他业务'];
App.TASK_TYPES = [
  { value: 'video',   label: '📹 视频拍摄' },
  { value: 'photo',   label: '📸 照片拍摄' },
  { value: 'editing', label: '🎬 剪辑' }
];

App.DURATION_OPTIONS = [
  { value: 1,  label: '1小时' },
  { value: 2,  label: '2小时' },
  { value: 3,  label: '3小时' },
  { value: 4,  label: '半天(4小时)' },
  { value: 8,  label: '全天(8小时)' }
];

// ==================== ID 生成 ====================

App.generateId = function() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

// ==================== 金额格式化 ====================

App.formatCurrency = function(n) {
  if (n == null || isNaN(n)) return '¥0';
  return '¥' + Number(n).toLocaleString('zh-CN');
};

// ==================== 日期格式化 ====================

App.formatDate = function(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('YYYY-MM-DD');
};

App.formatDateTime = function(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
};

App.formatShortDate = function(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('M/D');
};

App.formatShortDateTime = function(dateStr) {
  if (!dateStr) return '';
  return dayjs(dateStr).format('M/D HH:mm');
};

// ==================== 时长标签 ====================

App.getDurationLabel = function(hours) {
  var opt = App.DURATION_OPTIONS.find(function(o) { return o.value === hours; });
  return opt ? opt.label : hours + '小时';
};

// ==================== 本周范围 ====================

App.getWeekRange = function() {
  var start = dayjs().startOf('week');
  var end = dayjs().endOf('week');
  return { start: start, end: end };
};

// ==================== 本月范围 ====================

App.getMonthRange = function() {
  var start = dayjs().startOf('month');
  var end = dayjs().endOf('month');
  return { start: start, end: end };
};

// ==================== 逾期天数 ====================

App.getOverdueDays = function(datetime) {
  var shootDate = dayjs(datetime);
  var dueDate = shootDate.add(5, 'day');
  var today = dayjs().startOf('day');
  if (today.isAfter(dueDate)) {
    return today.diff(dueDate, 'day');
  }
  return 0;
};

// ==================== 防抖 ====================

App.debounce = function(fn, delay) {
  var timer = null;
  return function() {
    var context = this;
    var args = arguments;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(context, args);
    }, delay);
  };
};

// 设置 dayjs 中文
if (typeof dayjs !== 'undefined') {
  dayjs.locale('zh-cn');
}
