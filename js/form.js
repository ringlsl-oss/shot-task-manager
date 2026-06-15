/* ================================================================
 *  form.js — 新增/编辑任务表单，含自动计算时薪
 * ================================================================ */

window.App = window.App || {};

App.form = (function() {
  var currentTaskId = null;  // null = 新增模式，有值 = 编辑模式

  // ==================== 渲染表单 ====================

  function renderForm(mode, task) {
    currentTaskId = mode === 'edit' ? task.id : null;

    // 标题
    document.getElementById('form-title').textContent = mode === 'edit' ? '编辑任务' : '新增任务';

    // 删除按钮
    var delBtn = document.getElementById('btn-del');
    delBtn.style.display = mode === 'edit' ? 'block' : 'none';

    // 默认值
    var now = dayjs().format('YYYY-MM-DDTHH:mm');
    var data = {
      taskType: 'shooting',
      location: '',
      datetime: now,
      client: '',
      fee: '',
      duration: '4',
      paid: 'false',
      deadline: '',
      equipment: '',
      category: '',
      clientSource: '',
      notes: ''
    };

    if (task) {
      data.taskType = task.taskType || 'shooting';
      data.location = task.location || '';
      data.datetime = task.datetime ? dayjs(task.datetime).format('YYYY-MM-DDTHH:mm') : now;
      data.client = task.client || '';
      data.fee = task.fee != null ? task.fee : '';
      data.duration = task.duration != null ? String(task.duration) : '4';
      data.paid = task.paid ? 'true' : 'false';
      data.deadline = task.deadline || '';
      data.equipment = task.equipment || '';
      data.category = task.category || '';
      data.clientSource = task.clientSource || '';
      data.notes = task.notes || '';
    }

    var isShooting = data.taskType === 'shooting';

    // 构建类别选项
    var categoryOpts = App.CATEGORIES.map(function(c) {
      var sel = c === data.category ? ' selected' : '';
      return '<option value="' + c + '"' + sel + '>' + c + '</option>';
    }).join('');

    // 构建来源选项
    var sourceOpts = App.CLIENT_SOURCES.map(function(s) {
      var sel = s === data.clientSource ? ' selected' : '';
      return '<option value="' + s + '"' + sel + '>' + s + '</option>';
    }).join('');

    // 构建时长选项
    var durationOpts = App.DURATION_OPTIONS.map(function(o) {
      var sel = String(o.value) === data.duration ? ' selected' : '';
      return '<option value="' + o.value + '"' + sel + '>' + o.label + '</option>';
    }).join('');

    var paidYesSel = data.paid === 'true' ? ' selected' : '';
    var paidNoSel = data.paid === 'false' ? ' selected' : '';

    var shootingSel = data.taskType === 'shooting' ? ' selected' : '';
    var editingSel = data.taskType === 'editing' ? ' selected' : '';

    var html = '' +
      // ---- 任务类型切换 ----
      '<div class="form-group">' +
        '<label class="form-label">任务类型 <span class="required">*</span></label>' +
        '<div class="payment-toggle" id="f-tasktype-toggle">' +
          '<div class="payment-option paid-option' + shootingSel + '" data-value="shooting">📷 拍摄任务</div>' +
          '<div class="payment-option unpaid-option' + editingSel + '" data-value="editing">🎬 剪辑任务</div>' +
        '</div>' +
        '<input type="hidden" id="f-tasktype" value="' + data.taskType + '">' +
      '</div>' +

      '<div class="form-group">' +
        '<label class="form-label">客户名称 <span class="required">*</span></label>' +
        '<input type="text" class="form-input" id="f-client" placeholder="输入客户名称..." value="' + escapeHtml(data.client) + '">' +
      '</div>' +

      '<div class="form-group">' +
        '<label class="form-label">' + (isShooting ? '拍摄时间' : '开始时间') + ' <span class="required">*</span></label>' +
        '<input type="datetime-local" class="form-input" id="f-datetime" value="' + data.datetime + '">' +
      '</div>' +

      // 地点（仅拍摄任务）
      '<div class="form-group" id="f-group-location" style="' + (isShooting ? '' : 'display:none;') + '">' +
        '<label class="form-label">拍摄地点 <span class="required">*</span></label>' +
        '<input type="text" class="form-input" id="f-location" placeholder="输入拍摄地点..." value="' + escapeHtml(data.location) + '">' +
      '</div>' +

      // 时长（仅拍摄任务）
      '<div class="form-row" id="f-group-duration" style="' + (isShooting ? '' : 'display:none;') + '">' +
        '<div class="form-group">' +
          '<label class="form-label">费用（元） <span class="required">*</span></label>' +
          '<input type="number" class="form-input" id="f-fee" placeholder="0" value="' + data.fee + '" min="0" step="1">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">拍摄时长 <span class="required">*</span></label>' +
          '<select class="form-select" id="f-duration">' + durationOpts + '</select>' +
        '</div>' +
      '</div>' +

      // 费用（剪辑任务单独显示，不含时长）
      '<div class="form-group" id="f-group-fee-only" style="' + (isShooting ? 'display:none;' : '') + '">' +
        '<label class="form-label">费用（元） <span class="required">*</span></label>' +
        '<input type="number" class="form-input" id="f-fee2" placeholder="0" value="' + data.fee + '" min="0" step="1">' +
      '</div>' +

      // 时薪（仅拍摄任务）
      '<div class="hourly-rate" id="f-rate" style="' + (isShooting ? '' : 'display:none;') + '">' +
        '💡 预估时薪：<span class="rate-value">' + calcRateDisplay(data.fee, data.duration) + '</span>' +
      '</div>' +

      '<div class="form-group">' +
        '<label class="form-label">是否已收款 <span class="required">*</span></label>' +
        '<div class="payment-toggle">' +
          '<div class="payment-option paid-option' + paidYesSel + '" data-value="true">✅ 已收款</div>' +
          '<div class="payment-option unpaid-option' + paidNoSel + '" data-value="false">⏳ 未收款</div>' +
        '</div>' +
        '<input type="hidden" id="f-paid" value="' + data.paid + '">' +
      '</div>' +

      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label">任务类别 <span class="required">*</span></label>' +
          '<select class="form-select" id="f-category">' +
            '<option value="">请选择...</option>' + categoryOpts +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">甲方来源</label>' +
          '<select class="form-select" id="f-source">' +
            '<option value="">请选择...</option>' + sourceOpts +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div class="form-group">' +
        '<label class="form-label">交片截止日期</label>' +
        '<input type="date" class="form-input" id="f-deadline" value="' + data.deadline + '">' +
      '</div>' +

      // 器材（仅拍摄任务）
      '<div class="form-group" id="f-group-equipment" style="' + (isShooting ? '' : 'display:none;') + '">' +
        '<label class="form-label">所需器材</label>' +
        '<input type="text" class="form-input" id="f-equipment" placeholder="输入使用的设备..." value="' + escapeHtml(data.equipment) + '">' +
      '</div>' +

      '<div class="form-group">' +
        '<label class="form-label">备注</label>' +
        '<textarea class="form-textarea" id="f-notes" placeholder="其他需要记录的信息...">' + escapeHtml(data.notes) + '</textarea>' +
      '</div>';

    document.getElementById('form-body').innerHTML = html;

    // 绑定事件
    bindEvents();
  }

  // ==================== HTML 转义 ====================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==================== 时薪显示 ====================

  function calcRateDisplay(fee, duration) {
    var f = parseFloat(fee);
    var d = parseFloat(duration);
    if (!f || !d || d <= 0) return '-- 元/小时';
    var rate = Math.round(f / d);
    return App.formatCurrency(rate) + '/小时';
  }

  // ==================== 实时计算时薪 ====================

  function updateRate() {
    var fee = document.getElementById('f-fee').value;
    var dur = document.getElementById('f-duration').value;
    var rateEl = document.querySelector('#f-rate .rate-value');
    if (rateEl) {
      rateEl.textContent = calcRateDisplay(fee, dur);
    }
  }

  // ==================== 绑定事件 ====================

  function bindEvents() {
    var feeEl = document.getElementById('f-fee');
    var feeOnlyEl = document.getElementById('f-fee2');
    var durEl = document.getElementById('f-duration');

    if (feeEl) feeEl.addEventListener('input', updateRate);
    if (feeOnlyEl) feeOnlyEl.addEventListener('input', function() { feeEl.value = feeOnlyEl.value; updateRate(); });
    if (durEl) durEl.addEventListener('change', updateRate);

    // 支付状态切换
    var payOptions = document.querySelectorAll('.payment-option');
    payOptions.forEach(function(opt) {
      opt.addEventListener('click', function() {
        payOptions.forEach(function(o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        document.getElementById('f-paid').value = opt.dataset.value;
      });
    });

    // 任务类型切换：显示/隐藏地点和器材
    var typeOptions = document.querySelectorAll('#f-tasktype-toggle .payment-option');
    typeOptions.forEach(function(opt) {
      opt.addEventListener('click', function() {
        typeOptions.forEach(function(o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        document.getElementById('f-tasktype').value = opt.dataset.value;

        var isShooting = opt.dataset.value === 'shooting';
        var locGroup = document.getElementById('f-group-location');
        var equipGroup = document.getElementById('f-group-equipment');
        var durGroup = document.getElementById('f-group-duration');
        var feeOnlyGroup = document.getElementById('f-group-fee-only');
        var rateEl = document.getElementById('f-rate');

        if (locGroup) locGroup.style.display = isShooting ? '' : 'none';
        if (equipGroup) equipGroup.style.display = isShooting ? '' : 'none';
        if (durGroup) durGroup.style.display = isShooting ? '' : 'none';
        if (feeOnlyGroup) feeOnlyGroup.style.display = isShooting ? 'none' : '';
        if (rateEl) rateEl.style.display = isShooting ? '' : 'none';

        // 同步两个费用字段的值
        var feeEl = document.getElementById('f-fee');
        var feeOnlyEl = document.getElementById('f-fee2');
        if (isShooting && feeOnlyEl && feeEl) feeEl.value = feeOnlyEl.value;
        if (!isShooting && feeEl && feeOnlyEl) feeOnlyEl.value = feeEl.value;

        // 更新"拍摄时间" → "开始时间"
        var dtLabel = document.querySelector('#f-datetime').closest('.form-group').querySelector('.form-label');
        if (dtLabel) dtLabel.innerHTML = isShooting ? '拍摄时间 <span class="required">*</span>' : '开始时间 <span class="required">*</span>';
      });
    });
  }

  // ==================== 表单校验 ====================

  function validate() {
    var client = document.getElementById('f-client').value.trim();
    var datetime = document.getElementById('f-datetime').value.trim();
    var taskType = document.getElementById('f-tasktype').value;
    var location = document.getElementById('f-location').value.trim();
    var fee = document.getElementById('f-fee').value.trim();
    var category = document.getElementById('f-category').value.trim();

    var duration = document.getElementById('f-duration').value.trim();

    var errors = [];
    if (!client) errors.push('请填写客户名称');
    if (!datetime) errors.push('请选择时间');
    if (taskType === 'shooting' && !location) errors.push('请填写拍摄地点');
    if (!fee || parseFloat(fee) < 0) errors.push('请填写有效的费用');
    if (taskType === 'shooting' && (!duration || parseInt(duration) <= 0)) errors.push('请选择拍摄时长');
    if (!category) errors.push('请选择任务类别');

    if (errors.length > 0) {
      App.showToast(errors[0]);
      return false;
    }
    return true;
  }

  // ==================== 收集表单数据 ====================

  function collectData() {
    var taskType = document.getElementById('f-tasktype').value || 'shooting';
    var isShooting = taskType === 'shooting';
    var duration = isShooting ? (parseInt(document.getElementById('f-duration').value) || 4) : 0;
    var feeEl = isShooting ? document.getElementById('f-fee') : document.getElementById('f-fee2');
    var fee = parseFloat(feeEl.value) || 0;
    var paid = document.getElementById('f-paid').value === 'true';

    var task = {
      id: currentTaskId || App.generateId(),
      taskType: document.getElementById('f-tasktype').value || 'shooting',
      client: document.getElementById('f-client').value.trim(),
      datetime: document.getElementById('f-datetime').value.trim(),
      location: document.getElementById('f-location').value.trim(),
      fee: fee,
      duration: duration,
      hourlyRate: isShooting ? Math.round(fee / duration) : 0,
      paid: paid,
      category: document.getElementById('f-category').value.trim(),
      clientSource: document.getElementById('f-source').value.trim(),
      deadline: document.getElementById('f-deadline').value.trim(),
      equipment: document.getElementById('f-equipment').value.trim(),
      notes: document.getElementById('f-notes').value.trim(),
      createdAt: currentTaskId ? undefined : dayjs().format('YYYY-MM-DD HH:mm:ss')
    };

    // 编辑模式下保留原创建时间
    if (currentTaskId) {
      return App.store.getById(currentTaskId).then(function(original) {
        if (original) {
          task.createdAt = original.createdAt;
        }
        return task;
      });
    }
    return Promise.resolve(task);
  }

  // ==================== 保存 ====================

  function save() {
    if (!validate()) return;

    collectData().then(function(task) {
      App.store.put(task).then(function() {
        closeModal();
        App.showToast(task.id === currentTaskId && currentTaskId ? '任务已更新 ✅' : '任务已添加 ✅');
        App.refreshAll();
      }).catch(function(err) {
        console.error('保存失败:', err);
        App.showToast('保存失败，请重试');
      });
    });
  }

  // ==================== 删除 ====================

  function deleteTask() {
    if (!currentTaskId) return;
    App.showConfirm(
      '确认删除？',
      '删除后无法恢复，确定要删除这条任务吗？',
      function() {
        App.store.delete(currentTaskId).then(function() {
          closeModal();
          App.showToast('任务已删除 🗑');
          App.refreshAll();
        }).catch(function(err) {
          console.error('删除失败:', err);
          App.showToast('删除失败，请重试');
        });
      }
    );
  }

  // ==================== 打开/关闭 ====================

  function openModal(mode, task) {
    renderForm(mode, task);
    document.getElementById('modal-form').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('modal-form').classList.remove('show');
    document.body.style.overflow = '';
    currentTaskId = null;
  }

  // ==================== 初始化事件 ====================

  function init() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-save').addEventListener('click', save);
    document.getElementById('btn-del').addEventListener('click', deleteTask);

    // 点击遮罩关闭
    document.getElementById('modal-form').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
  }

  return {
    init: init,
    open: openModal,
    close: closeModal
  };
})();
