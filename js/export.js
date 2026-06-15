/* ================================================================
 *  export.js — 数据导出：CSV / Excel / JSON 备份
 * ================================================================ */

window.App = window.App || {};

App.exportData = (function() {

  // ==================== 字段映射 ====================

  var HEADERS = [
    { key: 'client',      label: '客户名称' },
    { key: 'taskType',    label: '任务类型' },
    { key: 'datetime',    label: '拍摄时间' },
    { key: 'location',    label: '拍摄地点' },
    { key: 'fee',         label: '费用(元)' },
    { key: 'duration',    label: '拍摄时长' },
    { key: 'hourlyRate',  label: '时薪(元/小时)' },
    { key: 'paid',        label: '是否已收款' },
    { key: 'category',    label: '拍摄类别' },
    { key: 'clientSource',label: '甲方来源' },
    { key: 'deadline',    label: '交片截止日期' },
    { key: 'equipment',   label: '所需器材' },
    { key: 'notes',       label: '备注' },
    { key: 'createdAt',   label: '创建时间' }
  ];

  // ==================== 格式化任务数据 ====================

  function formatTask(task) {
    return {
      taskType:     task.taskType === 'video' ? '视频拍摄' : task.taskType === 'photo' ? '照片拍摄' : '剪辑',
      client:       task.client || '',
      datetime:     App.formatDateTime(task.datetime),
      location:     task.location || '',
      fee:          task.fee != null ? task.fee : 0,
      duration:     App.getDurationLabel(task.duration),
      hourlyRate:   task.hourlyRate != null ? task.hourlyRate : '',
      paid:         task.paid ? '已收款' : '未收款',
      category:     task.category || '',
      clientSource: task.clientSource || '',
      deadline:     task.deadline || '',
      equipment:    task.equipment || '',
      notes:        task.notes || '',
      createdAt:    task.createdAt || ''
    };
  }

  // ==================== CSV 导出 ====================

  function exportCSV() {
    App.store.getAll().then(function(tasks) {
      if (tasks.length === 0) {
        App.showToast('没有数据可导出');
        return;
      }

      // CSV BOM for Excel 中文兼容
      var bom = '﻿';
      var headerLine = HEADERS.map(function(h) { return '"' + h.label + '"'; }).join(',');

      var rows = tasks.map(function(task) {
        var data = formatTask(task);
        return HEADERS.map(function(h) {
          var val = String(data[h.key] || '');
          // 转义引号
          return '"' + val.replace(/"/g, '""') + '"';
        }).join(',');
      });

      var csv = bom + headerLine + '\n' + rows.join('\n');

      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = '拍摄任务_' + dayjs().format('YYYY-MM-DD') + '.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      App.showToast('CSV 导出成功 📥');
    });
  }

  // ==================== Excel 导出（动态加载 SheetJS） ====================

  function exportExcel() {
    App.store.getAll().then(function(tasks) {
      if (tasks.length === 0) {
        App.showToast('没有数据可导出');
        return;
      }

      // 如果 SheetJS 已加载
      if (typeof XLSX !== 'undefined') {
        doExcelExport(tasks);
        return;
      }

      // 动态加载 SheetJS
      App.showToast('正在加载 Excel 引擎...');

      var script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
      script.onload = function() {
        doExcelExport(tasks);
      };
      script.onerror = function() {
        App.showToast('Excel 引擎加载失败，请使用 CSV 导出或检查网络连接');
      };
      document.head.appendChild(script);
    });
  }

  function doExcelExport(tasks) {
    var headerRow = HEADERS.map(function(h) { return h.label; });

    var dataRows = tasks.map(function(task) {
      var data = formatTask(task);
      return HEADERS.map(function(h) { return data[h.key]; });
    });

    var sheetData = [headerRow].concat(dataRows);
    var worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // 设置列宽
    var colWidths = [
      { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }
    ];
    worksheet['!cols'] = colWidths;

    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '拍摄任务');

    XLSX.writeFile(workbook, '拍摄任务_' + dayjs().format('YYYY-MM-DD') + '.xlsx');
    App.showToast('Excel 导出成功 📊');
  }

  // ==================== JSON 备份 ====================

  function exportJSON() {
    App.store.getAll().then(function(tasks) {
      if (tasks.length === 0) {
        App.showToast('没有数据可备份');
        return;
      }

      var json = JSON.stringify(tasks, null, 2);
      var blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = '拍摄任务_备份_' + dayjs().format('YYYY-MM-DD') + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      App.showToast('数据备份成功 💾');
    });
  }

  // ==================== JSON 导入恢复 ====================

  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          App.showToast('文件格式不正确');
          return;
        }

        App.showConfirm(
          '确认导入？',
          '将导入 ' + data.length + ' 条任务记录，这会覆盖现有数据吗？点击确认将追加（不覆盖已有相同ID的任务）。',
          function() {
            App.store.importData(data).then(function() {
              App.showToast('导入成功 ✅');
              App.refreshAll();
            }).catch(function() {
              App.showToast('导入失败，请重试');
            });
          }
        );
      } catch (err) {
        App.showToast('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  }

  // ==================== 初始化 ====================

  function init() {
    var btnCSV = document.getElementById('btn-export-csv');
    var btnExcel = document.getElementById('btn-export-excel');
    var btnJSON = document.getElementById('btn-export-json');
    var btnImport = document.getElementById('btn-import-json');

    if (btnCSV) btnCSV.addEventListener('click', exportCSV);
    if (btnExcel) btnExcel.addEventListener('click', exportExcel);
    if (btnJSON) btnJSON.addEventListener('click', exportJSON);
    if (btnImport) {
      btnImport.addEventListener('click', function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', function() {
          if (input.files && input.files[0]) {
            importJSON(input.files[0]);
          }
        });
        input.click();
      });
    }
  }

  return {
    init: init,
    exportCSV: exportCSV,
    exportExcel: exportExcel,
    exportJSON: exportJSON,
    importJSON: importJSON
  };
})();
