/* ================================================================
 *  store.js — IndexedDB 数据存取层
 *  数据库: PhotoTaskDB, 对象存储: tasks
 * ================================================================ */

window.App = window.App || {};

App.store = (function() {
  var DB_NAME = 'PhotoTaskDB';
  var DB_VERSION = 1;
  var STORE_NAME = 'tasks';
  var db = null;

  // ==================== 打开数据库 ====================

  function open() {
    return new Promise(function(resolve, reject) {
      if (db) { return resolve(db); }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function(e) {
        var database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          var store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('datetime', 'datetime', { unique: false });
          store.createIndex('paid', 'paid', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('client', 'client', { unique: false });
        }
      };

      request.onsuccess = function(e) {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = function(e) {
        console.error('IndexedDB 打开失败:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  // ==================== 获取全部任务 ====================

  function getAll() {
    return open().then(function() {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readonly');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.getAll();

        request.onsuccess = function(e) {
          resolve(e.target.result || []);
        };

        request.onerror = function(e) {
          console.error('读取任务失败:', e.target.error);
          reject(e.target.error);
        };
      });
    });
  }

  // ==================== 根据ID获取 ====================

  function getById(id) {
    return open().then(function() {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readonly');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.get(id);

        request.onsuccess = function(e) {
          resolve(e.target.result);
        };

        request.onerror = function(e) {
          reject(e.target.error);
        };
      });
    });
  }

  // ==================== 新增/更新 ====================

  function put(task) {
    return open().then(function() {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readwrite');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.put(task);

        transaction.oncomplete = function() {
          resolve();
        };

        request.onerror = function(e) {
          reject(e.target.error);
        };
      });
    });
  }

  // ==================== 删除 ====================

  function deleteById(id) {
    return open().then(function() {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readwrite');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.delete(id);

        transaction.oncomplete = function() {
          resolve();
        };

        request.onerror = function(e) {
          reject(e.target.error);
        };
      });
    });
  }

  // ==================== 清空全部 ====================

  function clear() {
    return open().then(function() {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readwrite');
        var store = transaction.objectStore(STORE_NAME);
        var request = store.clear();

        transaction.oncomplete = function() {
          resolve();
        };

        request.onerror = function(e) {
          reject(e.target.error);
        };
      });
    });
  }

  // ==================== 导入数据 ====================

  function importData(tasks) {
    return open().then(function() {
      return new Promise(function(resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readwrite');
        var store = transaction.objectStore(STORE_NAME);

        tasks.forEach(function(task) {
          store.put(task);
        });

        transaction.oncomplete = function() {
          resolve();
        };

        transaction.onerror = function(e) {
          reject(e.target.error);
        };
      });
    });
  }

  // 公开 API
  return {
    open: open,
    getAll: getAll,
    getById: getById,
    put: put,
    delete: deleteById,
    clear: clear,
    importData: importData
  };
})();
